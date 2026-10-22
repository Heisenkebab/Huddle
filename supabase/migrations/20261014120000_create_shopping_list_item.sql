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

-- Adds an item, or merges the amount into its open entry (merged = true).
-- Hints: 'unit_mismatch' (units can't be combined), 'invalid_amount'.
CREATE OR REPLACE FUNCTION public.create_shopping_list_item(
  p_trip_id uuid,
  p_name text,
  p_category public."Category",
  p_unit public."Unit",
  p_amount numeric
)
-- Returns the item's columns itself: a PostgREST embed runs in the same
-- statement as the function and can't see the item the function just created
RETURNS TABLE (
  id uuid,
  shopping_list_item_id uuid,
  unit public."Unit",
  amount numeric,
  name text,
  category public."Category",
  merged boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
-- The output columns share names with table columns; in queries, mean the
-- table columns
#variable_conflict use_column
DECLARE
  v_item_id uuid;
  v_history_id uuid;
  v_open_unit public."Unit";
  v_open_amount numeric;
  v_new_amount numeric;
  v_merged boolean := false;
BEGIN
  -- RLS doesn't apply in a SECURITY DEFINER function, so check membership here
  IF NOT public.is_trip_member(p_trip_id) THEN
    RAISE EXCEPTION 'Not a member of trip %', p_trip_id USING ERRCODE = '42501';
  END IF;

  -- Checked here and not only by the table constraint: when merging, p_amount
  -- itself is never written, so e.g. a negative amount would slip through
  IF NOT public.is_valid_amount(p_unit, p_amount) THEN
    RAISE EXCEPTION 'Invalid amount % for unit %', p_amount, p_unit
      USING HINT = 'invalid_amount';
  END IF;

  -- Fails with a foreign key error if the trip does not exist
  INSERT INTO public.shopping_list_item (trip_id, name, category)
  VALUES (p_trip_id, trim(p_name), p_category)
  ON CONFLICT (trip_id, (lower(trim(name)))) DO NOTHING
  RETURNING id INTO v_item_id;

  IF v_item_id IS NULL THEN
    SELECT id INTO STRICT v_item_id
    FROM public.shopping_list_item
    WHERE trip_id = p_trip_id
      AND lower(trim(name)) = lower(trim(p_name));
  END IF;

  -- shopping_list_history_one_open_idx guarantees at most one open entry.
  -- The lock makes two people adding the same item at once merge one after
  -- the other instead of both trying to open a new entry.
  SELECT id, unit, amount INTO v_history_id, v_open_unit, v_open_amount
  FROM public.shopping_list_history
  WHERE shopping_list_item_id = v_item_id
    AND bought_at IS NULL
    AND removed_at IS NULL
  FOR UPDATE;

  IF v_history_id IS NULL THEN
    INSERT INTO public.shopping_list_history (shopping_list_item_id, unit, amount)
    VALUES (v_item_id, p_unit, p_amount)
    RETURNING id INTO v_history_id;
  ELSIF public.unit_group(v_open_unit) <> public.unit_group(p_unit) THEN
    RAISE EXCEPTION 'Item % is already on the list in %', v_item_id, v_open_unit
      USING HINT = 'unit_mismatch';
  ELSE
    v_new_amount := v_open_amount
      + p_amount * public.unit_factor(p_unit) / public.unit_factor(v_open_unit);

    -- The sum can go over the upper limit even if both amounts are valid
    IF NOT public.is_valid_amount(v_open_unit, v_new_amount) THEN
      RAISE EXCEPTION 'Invalid amount % for unit %', v_new_amount, v_open_unit
        USING HINT = 'invalid_amount';
    END IF;

    UPDATE public.shopping_list_history
    SET amount = v_new_amount
    WHERE id = v_history_id;

    v_merged := true;
  END IF;

  RETURN QUERY
  SELECT h.id, h.shopping_list_item_id, h.unit, h.amount, i.name, i.category,
         v_merged
  FROM public.shopping_list_history h
  JOIN public.shopping_list_item i ON i.id = h.shopping_list_item_id
  WHERE h.id = v_history_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_shopping_list_item(
  uuid, text, public."Category", public."Unit", numeric
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_shopping_list_item(
  uuid, text, public."Category", public."Unit", numeric
) TO authenticated;
