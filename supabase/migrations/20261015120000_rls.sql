-- Row Level Security: signed-in users only see and change data of trips they
-- own or joined as a guest. Anonymous visitors get nothing.

-- Helpers ---------------------------------------------------------------------
-- SECURITY DEFINER so they can read profile/trip/guest_trip without running
-- into those tables' own policies (which call these helpers -> recursion).
-- search_path = '' forces fully qualified names, so callers can't swap tables.

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM public.profile WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_trip_owner(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip
    WHERE id = p_trip_id
      AND owner_id = public.current_profile_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_trip_member(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.is_trip_owner(p_trip_id) OR EXISTS (
    SELECT 1 FROM public.guest_trip
    WHERE trip_id = p_trip_id
      AND profile_id = public.current_profile_id()
  );
$$;

-- True if the given profile is in at least one trip with the current user
CREATE OR REPLACE FUNCTION public.shares_trip_with(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trip t
    LEFT JOIN public.guest_trip g ON g.trip_id = t.id
    WHERE (t.owner_id = p_profile_id OR g.profile_id = p_profile_id)
      AND public.is_trip_member(t.id)
  );
$$;

-- Anonymous sign-ins also get the authenticated role; only the JWT tells them apart
CREATE OR REPLACE FUNCTION public.is_anonymous_user()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

-- profile ---------------------------------------------------------------------
ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read their own profile and trip mates"
  ON public.profile FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.shares_trip_with(id));

CREATE POLICY "users create their own profile"
  ON public.profile FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users update their own profile"
  ON public.profile FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- No delete policy: the profile is deleted with the auth account (cascade)

-- trip ------------------------------------------------------------------------
ALTER TABLE public.trip ENABLE ROW LEVEL SECURITY;

-- The owner_id check is needed for INSERT ... RETURNING: is_trip_member()
-- runs its own query and can't see the row that is being inserted yet
CREATE POLICY "members read the trip"
  ON public.trip FOR SELECT TO authenticated
  USING (
    owner_id = public.current_profile_id()
    OR public.is_trip_member(id)
  );

-- Anonymous users can only join trips, creating one needs a real account
CREATE POLICY "users create trips they own"
  ON public.trip FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = public.current_profile_id()
    AND NOT public.is_anonymous_user()
  );

CREATE POLICY "owner updates the trip"
  ON public.trip FOR UPDATE TO authenticated
  USING (public.is_trip_owner(id))
  WITH CHECK (public.is_trip_owner(id));

CREATE POLICY "owner deletes the trip"
  ON public.trip FOR DELETE TO authenticated
  USING (public.is_trip_owner(id));

-- trip_invite -----------------------------------------------------------------
-- Every member may create or regenerate the link. Joining with a link can't
-- go through this table (the joiner is no member yet), so that will need a
-- SECURITY DEFINER function like join_trip(invite_id).
ALTER TABLE public.trip_invite ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members manage the trip's invite"
  ON public.trip_invite FOR ALL TO authenticated
  USING (public.is_trip_owner(trip_id))
  WITH CHECK (public.is_trip_owner(trip_id));

-- guest_trip ------------------------------------------------------------------
-- No insert policy: guests are added by the join function mentioned above
ALTER TABLE public.guest_trip ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members see who is in the trip"
  ON public.guest_trip FOR SELECT TO authenticated
  USING (public.is_trip_member(trip_id));

CREATE POLICY "guests leave, owner removes guests"
  ON public.guest_trip FOR DELETE TO authenticated
  USING (
    profile_id = public.current_profile_id()
    OR public.is_trip_owner(trip_id)
  );

-- shopping_list_item ----------------------------------------------------------
ALTER TABLE public.shopping_list_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members manage the trip's items"
  ON public.shopping_list_item FOR ALL TO authenticated
  USING (public.is_trip_member(trip_id))
  WITH CHECK (public.is_trip_member(trip_id));

-- shopping_list_history -------------------------------------------------------
ALTER TABLE public.shopping_list_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members manage the trip's item history"
  ON public.shopping_list_history FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shopping_list_item i
      WHERE i.id = shopping_list_item_id
        AND public.is_trip_member(i.trip_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shopping_list_item i
      WHERE i.id = shopping_list_item_id
        AND public.is_trip_member(i.trip_id)
    )
  );

-- bills / bill ----------------------------------------------------------------
-- Not linked to a trip yet, so there is no rule to write. RLS without policies
-- blocks all API access until they are connected.
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill ENABLE ROW LEVEL SECURITY;
