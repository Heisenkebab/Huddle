import {
  cleanUp,
  createTestTrip,
  createTestUser,
  TEST_PASSWORD,
  TEST_TRIP,
  TestUser,
} from "@/test/integration/fixtures";
import {
  signInAnonymously,
  signInAs,
  signOut,
} from "@/test/integration/session";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { getTripAccess, NO_ACCESS_PATH } from "./trip-access";

// redirect() throws an error that Next recognizes by its digest
const REDIRECT_AWAY = {
  digest: expect.stringContaining(`NEXT_REDIRECT;replace;${NO_ACCESS_PATH};`),
};

describe("getTripAccess", () => {
  let owner: TestUser;
  let users: TestUser[];
  let tripId: string;
  let tripIds: string[];

  beforeEach(async () => {
    owner = await createTestUser("Owner");
    users = [owner];
    tripId = await createTestTrip(owner);
    tripIds = [tripId];
  });

  afterEach(async () => {
    signOut();
    await cleanUp(tripIds, users);
  });

  test("returns the trip and profile for the owner", async () => {
    await signInAs(owner.email, TEST_PASSWORD);

    const access = await getTripAccess(tripId);

    expect(access).toEqual({
      trip: {
        id: tripId,
        name: TEST_TRIP.name,
        start_date: "2026-07-01",
        end_date: "2026-07-08",
      },
      profile: { id: owner.profileId, name: "Owner", color: "#E0A526" },
      isOwner: true,
    });
  });

  test("lets a guest of the trip in, but not as owner", async () => {
    const guest = await createTestUser("Guest");
    users.push(guest);
    const guestTripId = await createTestTrip(owner, [guest]);
    tripIds.push(guestTripId);
    await signInAs(guest.email, TEST_PASSWORD);

    const access = await getTripAccess(guestTripId);

    expect(access.trip.id).toBe(guestTripId);
    expect(access.profile.id).toBe(guest.profileId);
    expect(access.isOwner).toBe(false);
  });

  test("sends visitors who are not signed in away", async () => {
    await expect(getTripAccess(tripId)).rejects.toMatchObject(REDIRECT_AWAY);
  });

  test("sends signed-in users without a profile away", async () => {
    await signInAnonymously();

    await expect(getTripAccess(tripId)).rejects.toMatchObject(REDIRECT_AWAY);
  });

  test("sends users who are not in the trip away", async () => {
    const stranger = await createTestUser("Stranger");
    users.push(stranger);
    await signInAs(stranger.email, TEST_PASSWORD);

    await expect(getTripAccess(tripId)).rejects.toMatchObject(REDIRECT_AWAY);
  });

  test("sends users away from a trip that does not exist", async () => {
    await signInAs(owner.email, TEST_PASSWORD);

    await expect(getTripAccess(randomUUID())).rejects.toMatchObject(
      REDIRECT_AWAY,
    );
  });

  test("sends users away from an id that is not a UUID", async () => {
    await signInAs(owner.email, TEST_PASSWORD);

    await expect(getTripAccess("not-a-trip")).rejects.toMatchObject(
      REDIRECT_AWAY,
    );
  });
});
