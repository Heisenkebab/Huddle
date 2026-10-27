CREATE OR REPLACE FUNCTION public.restore_removed_shopping_list_item(
  p_trip_id uuid,
  p_item_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_history public.shopping_list_history%ROWTYPE;
BEGIN
    -- RLS doesn't apply in a SECURITY DEFINER function, so check membership here
    IF NOT public.is_trip_member(p_trip_id) THEN
        RAISE EXCEPTION 'Not a member of trip %', p_trip_id USING ERRCODE = '42501';
    END IF;

    SELECT h.* INTO v_history
        FROM public.shopping_list_item i INNER JOIN public.shopping_list_history h
        ON i.id = h.shopping_list_item_id
        WHERE i.trip_id = p_trip_id AND i.id = p_item_id
        ORDER BY h.created_at desc
        LIMIT 1
        FOR UPDATE OF h;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item % has no entry to change in trip %', p_item_id, p_trip_id;
    END IF;

    IF v_history.removed_at IS NULL THEN
        RAISE EXCEPTION 'Item % in trip % has not been removed', p_item_id, p_trip_id;
    END IF;

    UPDATE public.shopping_list_history
    SET removed_at = null
    WHERE id = v_history.id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.restore_removed_shopping_list_item(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_removed_shopping_list_item(uuid, uuid)
  TO authenticated;
