-- Joins the current user to the trip behind an invite link and returns its id.
-- SECURITY DEFINER because the joiner can't read trip_invite yet and
-- guest_trip has no insert policy (see 20261015120000_rls.sql).
CREATE OR REPLACE FUNCTION public.join_trip(
  p_invite_id uuid,
  p_name text,
  p_color text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id    uuid := auth.uid();
  v_trip_id    uuid;
  v_owner_id   uuid;
  v_profile_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501', HINT = 'not_authenticated';
  END IF;

  SELECT t.id, t.owner_id
  INTO v_trip_id, v_owner_id
  FROM public.trip_invite ti
  JOIN public.trip t ON t.id = ti.trip_id
  WHERE ti.invite_id = p_invite_id
    AND ti.ending_at > now();

  IF v_trip_id IS NULL THEN
    RAISE EXCEPTION 'invite not found or expired' USING ERRCODE = 'P0002', HINT = 'invite_invalid';
  END IF;

  -- Reuse an existing profile as is; name and color only apply to a new one.
  -- ON CONFLICT covers two joins racing to create the same profile.
  INSERT INTO public.profile (user_id, name, color)
  VALUES (v_user_id, trim(p_name), coalesce(p_color, '#E0A526'))
  ON CONFLICT (user_id) DO NOTHING;

  SELECT id INTO v_profile_id
  FROM public.profile
  WHERE user_id = v_user_id;

  -- The owner is already a member through trip.owner_id
  IF v_profile_id <> v_owner_id THEN
    INSERT INTO public.guest_trip (profile_id, trip_id)
    VALUES (v_profile_id, v_trip_id)
    ON CONFLICT (profile_id, trip_id) DO NOTHING;
  END IF;

  RETURN v_trip_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.join_trip(uuid, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_trip(uuid, text, text)
  TO authenticated;
