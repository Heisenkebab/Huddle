CREATE OR REPLACE FUNCTION public.remove_shopping_list_item(
  p_item_id uuid,
  p_trip_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- RLS doesn't apply in a SECURITY DEFINER function, so check membership here
  IF NOT public.is_trip_member(p_trip_id) THEN
    RAISE EXCEPTION 'Not a member of trip %', p_trip_id USING ERRCODE = '42501';
  END IF;

  UPDATE public.shopping_list_history
  SET removed_at = now()
  WHERE id = (
      SELECT h.id
      FROM public.shopping_list_history h
      JOIN public.shopping_list_item i ON i.id = h.shopping_list_item_id
      -- The trip check stops callers from changing an item of another trip
      WHERE h.shopping_list_item_id = p_item_id
        AND i.trip_id = p_trip_id
      ORDER BY h.created_at DESC
      LIMIT 1
    )
  AND bought_at IS NULL
  AND removed_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item % has no entry to change in trip %', p_item_id, p_trip_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.remove_shopping_list_item(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_shopping_list_item(uuid, uuid)
  TO authenticated;
