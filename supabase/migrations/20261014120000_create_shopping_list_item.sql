-- Adds an item to a trip's shopping list and returns the item id.
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
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_item_id uuid;
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
  VALUES (v_item_id, p_unit, p_amount);

  RETURN v_item_id;
END;
$$;
