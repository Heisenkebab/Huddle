-- trip_id lets the invite page send members straight to their trip. Only
-- members get it: a non-member only learns the trip id by joining (join_trip
-- returns it).
CREATE OR REPLACE FUNCTION public.get_trip_details_from_invite_id(
  p_invite_id uuid
)
RETURNS TABLE(
  name text,
  start_date date,
  end_date date,
  owner_name text,
  members jsonb,
  trip_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH invited_trip AS (
    SELECT t.*
    FROM public.trip_invite ti
    JOIN public.trip t ON t.id = ti.trip_id
    WHERE ti.invite_id = p_invite_id
      AND ti.ending_at > now()
  ),
  member AS (
    SELECT p.id, p.name, p.color
    FROM invited_trip t
    JOIN public.profile p ON p.id = t.owner_id       -- owner is a member
    UNION
    SELECT p.id, p.name, p.color
    FROM invited_trip t
    JOIN public.guest_trip gt ON gt.trip_id = t.id
    JOIN public.profile p     ON p.id = gt.profile_id
  )
  SELECT
    t.name,
    t.start_date,
    t.end_date,
    owner.name AS owner_name,
    (SELECT jsonb_agg(to_jsonb(m) ORDER BY m.name) FROM member m) AS members,
    -- NULL for anon too: current_profile_id() is NULL without a session
    CASE WHEN public.is_trip_member(t.id) THEN t.id END AS trip_id
  FROM invited_trip t
  JOIN public.profile owner ON owner.id = t.owner_id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_trip_details_from_invite_id(uuid)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_trip_details_from_invite_id(uuid)
  TO anon, authenticated;
