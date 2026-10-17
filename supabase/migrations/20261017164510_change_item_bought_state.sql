CREATE OR REPLACE FUNCTION set_shopping_list_item_bought(
  p_trip_id uuid,
  p_item_id uuid,
  p_bought boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  UPDATE shopping_list_history
  -- Buying an entry that is already bought keeps its first date
  SET bought_at = CASE WHEN p_bought THEN COALESCE(bought_at, now()) END,
      updated_at = now()
  WHERE id = (
      SELECT h.id
      FROM shopping_list_history h
      JOIN shopping_list_item i ON i.id = h.shopping_list_item_id
      -- The trip check stops callers from changing an item of another trip
      WHERE h.shopping_list_item_id = p_item_id
        AND i.trip_id = p_trip_id
      ORDER BY h.created_at DESC
      LIMIT 1
    )
    AND removed_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item % has no entry to change in trip %', p_item_id, p_trip_id;
  END IF;
END;
$$;