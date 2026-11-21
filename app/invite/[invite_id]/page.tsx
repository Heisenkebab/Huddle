import { notFound, redirect } from "next/navigation";

import { isUuid } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/trip-access";

import { getTripDetailsFromInviteId } from "./_actions/get-trip-details-from-invite-id";
import InviteFlow from "./_components/InviteFlow";
import { INVITE_INVALID_ERROR } from "./_lib/errors";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ invite_id: string }>;
}) {
  const { invite_id } = await params;
  // The RPC takes a uuid; anything else can't be an invite
  if (!isUuid(invite_id)) notFound();

  // Invalid or expired → not-found.tsx, other failures → error.tsx
  const result = await getTripDetailsFromInviteId(invite_id);
  if (!result.success) {
    if (result.error === INVITE_INVALID_ERROR) notFound();
    throw new Error(result.error);
  }

  const trip = result.data;
  // Owner and guests skip the invite and go straight to the trip
  if (trip.trip_id) redirect(`/trip/${trip.trip_id}`);

  const profile = await getCurrentProfile();

  return <InviteFlow inviteId={invite_id} trip={trip} profile={profile} />;
}
