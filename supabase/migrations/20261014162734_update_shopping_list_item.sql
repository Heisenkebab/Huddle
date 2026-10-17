-- Updates an item of a trip and returns its open history entry together with
-- the item's name and category. Only the fields that are not NULL are changed.
-- A new unit or amount is written to the item's open history entry in place.
CREATE OR REPLACE FUNCTION update_shopping_list_item(
  p_trip_id uuid,
  p_item_id uuid,
  p_name text DEFAULT NULL,
  p_category "Category" DEFAULT NULL,
  p_unit "Unit" DEFAULT NULL,
  p_amount numeric DEFAULT NULL
)
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
BEGIN
  -- The trip check stops callers from editing an item of another trip
  UPDATE shopping_list_item
  SET name = COALESCE(trim(p_name), name),
      category = COALESCE(p_category, category),
      updated_at = now()
  WHERE id = p_item_id
    AND trip_id = p_trip_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item % not found in trip %', p_item_id, p_trip_id;
  END IF;

  IF p_unit IS NOT NULL OR p_amount IS NOT NULL THEN
    -- shopping_list_history_one_open_idx guarantees at most one open entry,
    -- so this changes exactly one row
    UPDATE shopping_list_history
    SET unit = COALESCE(p_unit, unit),
        amount = COALESCE(p_amount, amount),
        updated_at = now()
    WHERE shopping_list_item_id = p_item_id
      AND bought_at IS NULL
      AND removed_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Item % has no open entry to update', p_item_id;
    END IF;
  END IF;

  RETURN QUERY
  SELECT h.id, h.shopping_list_item_id, h.unit, h.amount, i.name, i.category
  FROM shopping_list_history h
  JOIN shopping_list_item i ON i.id = h.shopping_list_item_id
  WHERE h.shopping_list_item_id = p_item_id
    AND h.bought_at IS NULL
    AND h.removed_at IS NULL;
END;
$$;
