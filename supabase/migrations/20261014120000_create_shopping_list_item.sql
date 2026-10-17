-- Adds an item to a trip's shopping list and returns the new history entry
-- together with the item's name and category.
-- Reuses the trip's existing item with the same name (ignoring case and
-- spaces), otherwise creates it. Then opens a new history entry for it.
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
  category "Category"
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
BEGIN
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

  -- Fails with a unique violation if the item already has an open entry.
  -- Merging amounts is done by findDuplicateShoppingListItem + updateItem.
  INSERT INTO shopping_list_history (shopping_list_item_id, unit, amount)
  VALUES (v_item_id, p_unit, p_amount)
  RETURNING id INTO v_history_id;

  RETURN QUERY
  SELECT h.id, h.shopping_list_item_id, h.unit, h.amount, i.name, i.category
  FROM shopping_list_history h
  JOIN shopping_list_item i ON i.id = h.shopping_list_item_id
  WHERE h.id = v_history_id;
END;
$$;
