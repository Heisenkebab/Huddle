-- Creates a shopping list item and its first history entry in a single transaction.
-- If any statement fails, the whole function is rolled back.
CREATE OR REPLACE FUNCTION create_shopping_list_item(
  p_invite_id text,
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
  v_trip_id uuid;
  v_item_id uuid := gen_random_uuid();
BEGIN
  SELECT id INTO STRICT v_trip_id
  FROM trip
  WHERE invite_id = p_invite_id;

  INSERT INTO shopping_list_item (id, name, category)
  VALUES (v_item_id, p_name, p_category);

  INSERT INTO shopping_list_history (trip_id, valid_from, shopping_list_item_id, unit, amount)
  VALUES (v_trip_id, now(), v_item_id, p_unit, p_amount);

  RETURN v_item_id;
END;
$$;
