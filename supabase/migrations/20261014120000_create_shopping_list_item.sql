-- Which group a unit belongs to. Amounts of units in the same group can be
-- added together after converting them with unit_factor.
CREATE OR REPLACE FUNCTION unit_group(p_unit "Unit")
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_unit
    WHEN 'KILOGRAM' THEN 'mass'
    WHEN 'GRAM' THEN 'mass'
    WHEN 'LITER' THEN 'volume'
    WHEN 'MILLILITER' THEN 'volume'
    ELSE 'amount'
  END;
$$;

-- How many base units (g, ml, pieces) one of the unit is
CREATE OR REPLACE FUNCTION unit_factor(p_unit "Unit")
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_unit
    WHEN 'KILOGRAM' THEN 1000
    WHEN 'LITER' THEN 1000
    ELSE 1
  END;
$$;

-- Adds an item to a trip's shopping list and returns its open history entry
-- together with the item's name and category.
-- Reuses the trip's existing item with the same name (ignoring case and
-- spaces), otherwise creates it. If the item already has an open entry, the
-- amount is added to it (converted into the entry's unit) and merged is true;
-- otherwise a new history entry is opened. Fails with hint 'unit_mismatch' if
-- the open entry's unit can't be combined with the new one (e.g. LITER and
-- AMOUNT), and with hint 'invalid_amount' if the amount doesn't fit its unit
-- (see is_valid_amount).
-- Everything runs in one transaction: if any statement fails, nothing is kept.
CREATE OR REPLACE FUNCTION create_shopping_list_item(
  p_trip_id uuid,
  p_name text,
  p_category "Category",
  p_unit "Unit",
  p_amount numeric
)
-- Returns the item's columns itself: a PostgREST embed runs in the same
-- statement as the function and can't see the item the function just created
RETURNS TABLE (
  id uuid,
  shopping_list_item_id uuid,
  unit "Unit",
  amount numeric,
  name text,
  category "Category",
  merged boolean
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
-- The output columns share names with table columns; in queries, mean the
-- table columns
#variable_conflict use_column
DECLARE
  v_item_id uuid;
  v_history_id uuid;
  v_open_unit "Unit";
  v_merged boolean := false;
BEGIN
  -- Checked here and not only by the table constraint: when merging, p_amount
  -- itself is never written, so e.g. a negative amount would slip through
  IF NOT is_valid_amount(p_unit, p_amount) THEN
    RAISE EXCEPTION 'Invalid amount % for unit %', p_amount, p_unit
      USING HINT = 'invalid_amount';
  END IF;

  -- Fails with a foreign key error if the trip does not exist
  INSERT INTO shopping_list_item (trip_id, name, category)
  VALUES (p_trip_id, trim(p_name), p_category)
  ON CONFLICT (trip_id, (lower(trim(name)))) DO NOTHING
  RETURNING id INTO v_item_id;

  IF v_item_id IS NULL THEN
    SELECT id INTO STRICT v_item_id
    FROM shopping_list_item
    WHERE trip_id = p_trip_id
      AND lower(trim(name)) = lower(trim(p_name));
  END IF;

  -- shopping_list_history_one_open_idx guarantees at most one open entry.
  -- The lock makes two people adding the same item at once merge one after
  -- the other instead of both trying to open a new entry.
  SELECT id, unit INTO v_history_id, v_open_unit
  FROM shopping_list_history
  WHERE shopping_list_item_id = v_item_id
    AND bought_at IS NULL
    AND removed_at IS NULL
  FOR UPDATE;

  IF v_history_id IS NULL THEN
    INSERT INTO shopping_list_history (shopping_list_item_id, unit, amount)
    VALUES (v_item_id, p_unit, p_amount)
    RETURNING id INTO v_history_id;
  ELSIF unit_group(v_open_unit) <> unit_group(p_unit) THEN
    RAISE EXCEPTION 'Item % is already on the list in %', v_item_id, v_open_unit
      USING HINT = 'unit_mismatch';
  ELSE
    UPDATE shopping_list_history
    SET amount = amount + p_amount * unit_factor(p_unit) / unit_factor(v_open_unit),
        updated_at = now()
    WHERE id = v_history_id;

    v_merged := true;
  END IF;

  RETURN QUERY
  SELECT h.id, h.shopping_list_item_id, h.unit, h.amount, i.name, i.category,
         v_merged
  FROM shopping_list_history h
  JOIN shopping_list_item i ON i.id = h.shopping_list_item_id
  WHERE h.id = v_history_id;
END;
$$;
