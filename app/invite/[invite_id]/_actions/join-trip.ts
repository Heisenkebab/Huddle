"use server";

import { isValidProfileColor, isValidProfileName } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { ActionResult } from "@/types/action-result";

export type JoinTripResult = ActionResult<{ tripId: string }>;

// SQLSTATE for a missing permission, raised for anon by PostgREST
const NOT_AUTHENTICATED = "42501";

/**
 * Adds the signed-in user to the trip behind the invite. Creates their profile
 * with `name` and `color` if they have none yet; an existing profile is kept
 * as is. Without a color the database picks a default.
 */
export async function joinTrip(
  inviteId: string,
  name: string,
  color?: string,
): Promise<JoinTripResult> {
  if (!isValidProfileName(name)) {
    return { success: false, error: "Invalid name" };
  }
  if (color !== undefined && !isValidProfileColor(color)) {
    return { success: false, error: "color_invalid" };
  }

  try {
    const supabase = await createClient();

    // Invite check, profile and guest_trip insert run in one transaction
    const { data, error } = await supabase.rpc("join_trip", {
      p_invite_id: inviteId,
      p_name: name,
      p_color: color,
    });

    if (error) {
      // What PostgREST returns when anon calls the function. That error comes
      // from PostgREST, not join_trip, so it has no hint to read the key from
      if (error.code === NOT_AUTHENTICATED) {
        return { success: false, error: "not_authenticated" };
      }
      // Errors raised by join_trip carry their message key as the hint
      if (error.hint) {
        return { success: false, error: error.hint };
      }
      throw new Error(error.message);
    }

    return { success: true, data: { tripId: data } };
  } catch (error) {
    console.error("joinTrip failed:", error);
    return { success: false, error: "join_failed" };
  }
}
