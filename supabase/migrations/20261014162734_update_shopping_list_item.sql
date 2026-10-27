-- Changes only the non-NULL fields; unit/amount go to the open entry.
-- Hint: 'invalid_amount'.
CREATE OR REPLACE FUNCTION public.update_shopping_list_item(
  p_trip_id uuid,
  p_item_id uuid,
  p_name text DEFAULT NULL,
  p_category public."Category" DEFAULT NULL,
  p_unit public."Unit" DEFAULT NULL,
  p_amount numeric DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  shopping_list_item_id uuid,
  unit public."Unit",
  amount numeric,
  name text,
  category public."Category"
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
-- The output columns share names with table columns; in queries, mean the
-- table columns
#variable_conflict use_column
DECLARE
  v_history_id uuid;
  v_unit public."Unit";
  v_amount numeric;
BEGIN
  -- RLS doesn't apply in a SECURITY DEFINER function, so check membership here
  IF NOT public.is_trip_member(p_trip_id) THEN
    RAISE EXCEPTION 'Not a member of trip %', p_trip_id USING ERRCODE = '42501';
  END IF;

  -- The trip check stops callers from editing an item of another trip
  UPDATE public.shopping_list_item
  SET name = COALESCE(trim(p_name), name),
      category = COALESCE(p_category, category),
      updated_at = now()
  WHERE id = p_item_id
    AND trip_id = p_trip_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item % not found in trip %', p_item_id, p_trip_id;
  END IF;

  IF p_unit IS NOT NULL OR p_amount IS NOT NULL THEN
    -- shopping_list_history_one_open_idx guarantees at most one open entry
    SELECT id, unit, amount INTO v_history_id, v_unit, v_amount
    FROM public.shopping_list_history
    WHERE shopping_list_item_id = p_item_id
      AND bought_at IS NULL
      AND removed_at IS NULL
    FOR UPDATE;

    IF v_history_id IS NULL THEN
      RAISE EXCEPTION 'Item % has no open entry to update', p_item_id;
    END IF;

    -- Checks the combination, so changing only the unit (e.g. 2.5 LITER to
    -- GRAM) is caught as well
    v_unit := COALESCE(p_unit, v_unit);
    v_amount := COALESCE(p_amount, v_amount);
    IF NOT public.is_valid_amount(v_unit, v_amount) THEN
      RAISE EXCEPTION 'Invalid amount % for unit %', v_amount, v_unit
        USING HINT = 'invalid_amount';
    END IF;

    UPDATE public.shopping_list_history
    SET unit = v_unit,
        amount = v_amount
    WHERE id = v_history_id;
  END IF;

  RETURN QUERY
  SELECT h.id, h.shopping_list_item_id, h.unit, h.amount, i.name, i.category
  FROM public.shopping_list_history h
  JOIN public.shopping_list_item i ON i.id = h.shopping_list_item_id
  WHERE h.shopping_list_item_id = p_item_id
    AND h.bought_at IS NULL
    AND h.removed_at IS NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_shopping_list_item(
  uuid, uuid, text, public."Category", public."Unit", numeric
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_shopping_list_item(
  uuid, uuid, text, public."Category", public."Unit", numeric
) TO authenticated;
