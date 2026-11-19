import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import de from "@/messages/de.json";
import en from "@/messages/en.json";
import { createAdminClient } from "@/test/integration/admin-client";
import {
  cleanUp,
  createTestTrip,
  createTestUser,
  TEST_PASSWORD,
  TestUser,
} from "@/test/integration/fixtures";
import {
  signInAnonymously,
  signInAs,
  signOut,
} from "@/test/integration/session";

import { joinTrip } from "./join-trip";

const admin = createAdminClient();

async function createInvite(tripId: string, endingAt?: string) {
  const { data, error } = await admin
    .from("trip_invite")
    .insert({ trip_id: tripId, ...(endingAt ? { ending_at: endingAt } : {}) })
    .select("invite_id")
    .single();
  if (error) throw error;
  return data.invite_id as string;
}

async function getProfile(userId: string) {
  const { data, error } = await admin
    .from("profile")
    .select("id, name, color")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function guestTripIds(profileId: string) {
  const { data, error } = await admin
    .from("guest_trip")
    .select("trip_id")
    .eq("profile_id", profileId);
  if (error) throw error;
  return data.map((row) => row.trip_id);
}

const locales = { de, en };

// Errors from the database come back as message keys under "invite", so the
// UI can show them in the user's language. Every locale needs a translation.
function expectTranslatedError(
  result: Awaited<ReturnType<typeof joinTrip>>,
  key: keyof typeof en.invite,
) {
  expect(result).toEqual({ success: false, error: key });
  for (const [locale, messages] of Object.entries(locales)) {
    expect(messages.invite[key], `${locale}: invite.${key}`).toEqual(
      expect.any(String),
    );
    expect(messages.invite[key].trim(), `${locale}: invite.${key}`).not.toBe(
      "",
    );
  }
}

describe("joinTrip", () => {
  let owner: TestUser;
  let tripId: string;
  let inviteId: string;
  const users: TestUser[] = [];
  const tripIds: string[] = [];

  // Anonymous users have no email/profile up front; cleanUp only needs userId
  async function signInAsNewAnonymousUser() {
    const { userId } = await signInAnonymously();
    users.push({ userId, profileId: "", email: "" });
    return userId;
  }

  beforeEach(async () => {
    owner = await createTestUser();
    users.push(owner);
    tripId = await createTestTrip(owner);
    tripIds.push(tripId);
    inviteId = await createInvite(tripId);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    signOut();
    await cleanUp(tripIds.splice(0), users.splice(0));
  });

  test("creates a profile for a new user and adds them as a guest", async () => {
    const userId = await signInAsNewAnonymousUser();

    expect(await joinTrip(inviteId, "  Guest ", "#123ABC")).toEqual({
      success: true,
      data: { tripId },
    });

    const profile = await getProfile(userId);
    expect(profile).toMatchObject({ name: "Guest", color: "#123ABC" });
    expect(await guestTripIds(profile!.id)).toEqual([tripId]);
  });

  test("uses a default color when none is picked", async () => {
    const userId = await signInAsNewAnonymousUser();

    await joinTrip(inviteId, "Guest");

    expect((await getProfile(userId))?.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  test("keeps an existing profile's name and color", async () => {
    const guest = await createTestUser("Existing");
    users.push(guest);
    await signInAs(guest.email, TEST_PASSWORD);

    expect(await joinTrip(inviteId, "Other", "#FFFFFF")).toMatchObject({
      success: true,
    });

    expect(await getProfile(guest.userId)).toEqual({
      id: guest.profileId,
      name: "Existing",
      color: "#E0A526",
    });
    expect(await guestTripIds(guest.profileId)).toEqual([tripId]);
  });

  test("joining twice adds the guest only once", async () => {
    const guest = await createTestUser("Guest");
    users.push(guest);
    await signInAs(guest.email, TEST_PASSWORD);

    await joinTrip(inviteId, "Guest");
    expect(await joinTrip(inviteId, "Guest")).toMatchObject({ success: true });

    expect(await guestTripIds(guest.profileId)).toEqual([tripId]);
  });

  test("the owner joining their own trip is not added as a guest", async () => {
    await signInAs(owner.email, TEST_PASSWORD);

    expect(await joinTrip(inviteId, "Test")).toEqual({
      success: true,
      data: { tripId },
    });
    expect(await guestTripIds(owner.profileId)).toEqual([]);
  });

  test("fails for an expired invite", async () => {
    await signInAsNewAnonymousUser();
    const expired = await createInvite(
      tripId,
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    );

    expectTranslatedError(await joinTrip(expired, "Guest"), "invite_invalid");
  });

  test("fails for an unknown invite id", async () => {
    const userId = await signInAsNewAnonymousUser();

    expectTranslatedError(
      await joinTrip(randomUUID(), "Guest"),
      "invite_invalid",
    );
    // The failed join rolls back, so no profile is left behind
    expect(await getProfile(userId)).toBeNull();
  });

  test("fails when not signed in", async () => {
    signOut();

    expectTranslatedError(
      await joinTrip(inviteId, "Guest"),
      "not_authenticated",
    );
  });

  test.each(["", "   ", "x".repeat(51)])(
    "rejects the invalid name %j",
    async (name) => {
      expect(await joinTrip(inviteId, name)).toEqual({
        success: false,
        error: "Invalid name",
      });
    },
  );

  test.each(["red", "#FFF", "url(x)"])(
    "rejects the invalid color %j",
    async (color) => {
      expect(await joinTrip(inviteId, "Guest", color)).toEqual({
        success: false,
        error: "color_invalid",
      });
    },
  );
});
