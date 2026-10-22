import { isTripId } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Trip } from "@/lib/types";
import { redirect } from "next/navigation";
import { cache } from "react";

/** Where visitors are sent when they aren't signed in or can't open the trip */
export const NO_ACCESS_PATH = "/";

export type TripAccess = {
  trip: Trip;
  /** Profile of the signed-in user */
  profile: Profile;
  isOwner: boolean;
};

/**
 * Profile id of the signed-in user, null if not signed in or without a profile.
 * Goes through the DB instead of supabase.auth: PostgREST verifies the token.
 */
const getCurrentProfileId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("current_profile_id");
  if (error) throw new Error(error.message);
  return data;
});

/**
 * Checks on loading a trip that the user is signed in and a member of it.
 * Not signed in, no profile, or no such trip / not a member → NO_ACCESS_PATH.
 * cache(): layout and pages of the same request hit the DB only once.
 */
export const getTripAccess = cache(
  async (tripId: string): Promise<TripAccess> => {
    const profileId = await getCurrentProfileId();
    if (!profileId) redirect(NO_ACCESS_PATH);

    const supabase = await createClient();

    if (!isTripId(tripId)) redirect(NO_ACCESS_PATH);

    const [profileResult, tripResult] = await Promise.all([
      supabase
        .from("profile")
        .select("id, name, color")
        .eq("id", profileId)
        .single(),
      supabase
        .from("trip")
        .select("id, name, start_date, end_date, owner_id")
        .eq("id", tripId)
        .maybeSingle(),
    ]);
    if (profileResult.error) throw new Error(profileResult.error.message);
    if (tripResult.error) throw new Error(tripResult.error.message);

    // RLS only returns trips the user is a member of: no row means either
    // "doesn't exist" or "no access", both redirect
    const trip = tripResult.data;
    if (!trip) redirect(NO_ACCESS_PATH);

    return {
      trip: {
        id: trip.id,
        name: trip.name,
        // timestamptz → date only, as formatTripDates expects
        start_date: trip.start_date.slice(0, 10),
        end_date: trip.end_date.slice(0, 10),
      },
      profile: profileResult.data,
      isOwner: trip.owner_id === profileId,
    };
  },
);
