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

-- Set by the database, so clients can't claim to be someone else.
-- created_by is fixed on insert and can't be changed afterwards.
-- updated_at is set on every write, so functions don't have to set it.
-- Own search_path, as it fires inside the RPCs with their empty one
CREATE OR REPLACE FUNCTION public.set_shopping_list_history_authors()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := public.current_profile_id();
  ELSE
    NEW.created_by := OLD.created_by;
  END IF;
  NEW.updated_by := public.current_profile_id();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER shopping_list_history_authors
  BEFORE INSERT OR UPDATE ON public.shopping_list_history
  FOR EACH ROW EXECUTE FUNCTION public.set_shopping_list_history_authors();

CREATE OR REPLACE FUNCTION public.set_shopping_list_item_bought(
  p_trip_id uuid,
  p_item_id uuid,
  p_bought boolean
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
  -- Buying an entry that is already bought keeps its first date
  SET bought_at = CASE WHEN p_bought THEN COALESCE(bought_at, now()) END
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
    AND removed_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item % has no entry to change in trip %', p_item_id, p_trip_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_shopping_list_item_bought(uuid, uuid, boolean)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_shopping_list_item_bought(uuid, uuid, boolean)
  TO authenticated;

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

CREATE OR REPLACE FUNCTION public.get_all_active_shopping_list_items(
  p_trip_id uuid
)
RETURNS TABLE (
  id uuid,
  trip_id uuid,
  name text,
  category public."Category",
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  bought_at timestamp with time zone,
  created_by uuid,
  updated_by uuid,
  unit public."Unit",
  amount numeric,
  created_by_name text,
  created_by_color text,
  updated_by_name text,
  updated_by_color text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    WITH latest as (
        SELECT DISTINCT ON (i.id)
            i.id,
            i.trip_id,
            i.name,
            i.category,
            h.created_at,
            h.updated_at,
            h.bought_at,
            h.removed_at,
            h.created_by,
            h.updated_by,
            h.unit,
            h.amount
        FROM public.shopping_list_item i
        INNER JOIN public.shopping_list_history h
        ON i.id = h.shopping_list_item_id
        WHERE i.trip_id = p_trip_id
        ORDER BY i.id, h.created_at desc
    )
    SELECT
        latest.id,
        latest.trip_id,
        latest.name,
        latest.category,
        latest.created_at,
        latest.updated_at,
        latest.bought_at,
        latest.created_by,
        latest.updated_by,
        latest.unit,
        latest.amount,
        created_user.name as created_by_name,
        created_user.color as created_by_color,
        update_user.name as updated_by_name,
        update_user.color as updated_by_color
    FROM latest
     -- LEFT JOIN: created_by/updated_by are NULL for seed/service-role rows and deleted profiles
    LEFT JOIN public.profile created_user ON latest.created_by = created_user.id 
    LEFT JOIN public.profile update_user ON latest.updated_by = update_user.id
    WHERE latest.removed_at IS NULL
    AND (latest.bought_at IS NULL OR latest.bought_at > now() - interval '2 days')
    ORDER BY latest.created_at;
END;
$$;

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
