"use server";

import { createClient } from "@/lib/supabase/server";
import { ActionResult } from "@/types/action-result";
import { Json } from "@/types/database.types";

import { INVITE_INVALID_ERROR } from "../_lib/errors";

export interface TripMember {
  id: string;
  name: string;
  color: string;
}

export interface TripDetailsFromInvite {
  name: string;
  start_date: string;
  end_date: string;
  owner_name: string;
  members: TripMember[];
  /** Only set when the signed-in user is already a member of the trip */
  trip_id: string | null;
}

export type GetTripDetailsFromInviteResult =
  ActionResult<TripDetailsFromInvite>;

function asMembers(json: Json): TripMember[] {
  return (json ?? []) as unknown as TripMember[];
}

export async function getTripDetailsFromInviteId(
  inviteId: string,
): Promise<GetTripDetailsFromInviteResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
      "get_trip_details_from_invite_id",
      {
        p_invite_id: inviteId,
      },
    );

    if (error) {
      throw new Error(error.message);
    }

    // The RPC returns a set of rows; a valid, unexpired invite yields exactly
    // one. No row means the invite is invalid or has expired.
    const row = data[0];

    if (!row) {
      return {
        success: false,
        error: INVITE_INVALID_ERROR,
      };
    }

    // `members` comes back as jsonb, typed `Json` by the generated types, so
    // narrow just that field to our shape.
    const trip: TripDetailsFromInvite = {
      ...row,
      members: asMembers(row.members),
    };

    return {
      success: true,
      data: trip,
    };
  } catch (error) {
    console.error("getTripDetailsFromInviteId failed:", error);
    return {
      success: false,
      error: "Failed to fetch trip details",
    };
  }
}
