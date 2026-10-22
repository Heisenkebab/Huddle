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
