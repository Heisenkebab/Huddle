import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createAdminClient } from "@/test/integration/admin-client";
import {
  cleanUp,
  createTestTrip,
  createTestUser,
  TEST_PASSWORD,
  TEST_TRIP,
  TestUser,
} from "@/test/integration/fixtures";
import { signInAs, signOut } from "@/test/integration/session";

import { getTripDetailsFromInviteId } from "./get-trip-details-from-invite-id";

const admin = createAdminClient();

function inDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

// Creates an invite for a trip and returns its public invite_id. ending_at
// defaults to the DB's (now + 7 days) unless overridden.
async function createInvite(tripId: string, endingAt?: string) {
  const { data, error } = await admin
    .from("trip_invite")
    .insert({ trip_id: tripId, ...(endingAt ? { ending_at: endingAt } : {}) })
    .select("invite_id")
    .single();
  if (error) throw error;
  return data.invite_id as string;
}

async function getDetails(inviteId: string) {
  const result = await getTripDetailsFromInviteId(inviteId);
  if (!result.success) throw new Error(result.error);
  return result.data;
}

describe("getTripDetailsFromInviteId", () => {
  let owner: TestUser;
  let tripId: string;
  const users: TestUser[] = [];
  const tripIds: string[] = [];

  beforeEach(async () => {
    owner = await createTestUser();
    users.push(owner);
    tripId = await createTestTrip(owner);
    tripIds.push(tripId);
    await signInAs(owner.email, TEST_PASSWORD);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    signOut();
    await cleanUp(tripIds.splice(0), users.splice(0));
  });

  test("returns the trip's name, dates and owner name", async () => {
    const inviteId = await createInvite(tripId);

    expect(await getDetails(inviteId)).toMatchObject({
      name: TEST_TRIP.name,
      start_date: TEST_TRIP.start_date,
      end_date: TEST_TRIP.end_date,
      owner_name: "Test",
    });
  });

  test("includes the owner as a member with id, name and color", async () => {
    const inviteId = await createInvite(tripId);

    const { members } = await getDetails(inviteId);

    expect(members).toEqual([
      { id: owner.profileId, name: "Test", color: "#E0A526" },
    ]);
  });

  test("includes the trip's guests among the members", async () => {
    const guest = await createTestUser("Guest");
    users.push(guest);
    const guestTripId = await createTestTrip(owner, [guest]);
    tripIds.push(guestTripId);
    const inviteId = await createInvite(guestTripId);

    const { members } = await getDetails(inviteId);

    expect(members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: owner.profileId, name: "Test" }),
        expect.objectContaining({ id: guest.profileId, name: "Guest" }),
      ]),
    );
    expect(members).toHaveLength(2);
  });

  test("returns the members sorted by name", async () => {
    const zoe = await createTestUser("Zoe");
    const amy = await createTestUser("Amy");
    users.push(zoe, amy);
    const guestTripId = await createTestTrip(owner, [zoe, amy]);
    tripIds.push(guestTripId);
    const inviteId = await createInvite(guestTripId);

    const names = (await getDetails(inviteId)).members.map((m) => m.name);

    // "Amy", "Test" (owner), "Zoe"
    expect(names).toEqual(["Amy", "Test", "Zoe"]);
  });

  test("lets an anonymous caller read the details", async () => {
    const inviteId = await createInvite(tripId);
    signOut();

    expect(await getDetails(inviteId)).toMatchObject({ owner_name: "Test" });
  });

  test("fails for an expired invite", async () => {
    const inviteId = await createInvite(tripId, inDays(-1));

    expect(await getTripDetailsFromInviteId(inviteId)).toEqual({
      success: false,
      error: "This invite is invalid or has expired",
    });
  });

  test("fails for an unknown invite id", async () => {
    expect(await getTripDetailsFromInviteId(randomUUID())).toEqual({
      success: false,
      error: "This invite is invalid or has expired",
    });
  });
});
