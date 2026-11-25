"use server";

import { isValidProfileColor, isValidProfileName } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { ActionResult } from "@/types/action-result";

export type JoinTripResult = ActionResult<{ tripId: string }>;

/**
 * Adds the current user to the trip behind the invite, signing in anonymously
 * first if nobody is signed in. Creates their profile with `name` and `color`
 * if they have none yet; an existing profile is kept as is. Without a color
 * the database picks a default.
 */
export async function joinTrip(
  inviteId: string,
  name: string,
  color?: string,
): Promise<JoinTripResult> {
  if (!isValidProfileName(name)) {
    return { success: false, error: "name_invalid" };
  }
  if (color !== undefined && !isValidProfileColor(color)) {
    return { success: false, error: "color_invalid" };
  }

  try {
    const supabase = await createClient();

    // Guests join without an account. Signing in writes the session cookies,
    // so later requests and the RPC below run as the new anonymous user
    const { data: claims, error: claimsError } =
      await supabase.auth.getClaims();
    if (claimsError) throw claimsError;
    if (!claims) {
      const { error: signInError } = await supabase.auth.signInAnonymously({
        options: {
          data: {
            invite_id: inviteId,
          },
        },
      });
      if (signInError) throw signInError;
    }

    // Invite check, profile and guest_trip insert run in one transaction
    const { data, error } = await supabase.rpc("join_trip", {
      p_invite_id: inviteId,
      p_name: name,
      p_color: color,
    });

    if (error) {
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
