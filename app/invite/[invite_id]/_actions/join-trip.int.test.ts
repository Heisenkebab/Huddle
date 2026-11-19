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

async function anonymousUserIds() {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users.filter((user) => user.is_anonymous).map((user) => user.id);
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
  let anonymousBefore: Set<string>;
  const users: TestUser[] = [];
  const tripIds: string[] = [];

  // Anonymous users joinTrip signed in since beforeEach. Tests don't get their
  // session back, so they find them through the admin API instead.
  async function createdAnonymousUserIds() {
    const tracked = new Set(users.map((user) => user.userId));
    return (await anonymousUserIds()).filter(
      (id) => !anonymousBefore.has(id) && !tracked.has(id),
    );
  }

  // The one anonymous user joinTrip created, with the profile it got
  async function createdAnonymousGuest() {
    const ids = await createdAnonymousUserIds();
    expect(ids).toHaveLength(1);
    const profile = await getProfile(ids[0]!);
    expect(profile).not.toBeNull();
    return profile!;
  }

  // Anonymous users have no email/profile up front; cleanUp only needs userId
  async function signInAsNewAnonymousUser() {
    const { userId } = await signInAnonymously();
    users.push({ userId, profileId: "", email: "" });
    return userId;
  }

  beforeEach(async () => {
    signOut();
    anonymousBefore = new Set(await anonymousUserIds());
    owner = await createTestUser();
    users.push(owner);
    tripId = await createTestTrip(owner);
    tripIds.push(tripId);
    inviteId = await createInvite(tripId);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    signOut();
    const created = await createdAnonymousUserIds();
    users.push(
      ...created.map((userId) => ({ userId, profileId: "", email: "" })),
    );
    await cleanUp(tripIds.splice(0), users.splice(0));
  });

  test("signs in anonymously when nobody is signed in", async () => {
    expect(await joinTrip(inviteId, "Guest")).toEqual({
      success: true,
      data: { tripId },
    });

    expect(await createdAnonymousUserIds()).toHaveLength(1);
  });

  test("creates a profile for the new user and adds them as a guest", async () => {
    expect(await joinTrip(inviteId, "  Guest ", "#123ABC")).toEqual({
      success: true,
      data: { tripId },
    });

    const profile = await createdAnonymousGuest();
    expect(profile).toMatchObject({ name: "Guest", color: "#123ABC" });
    expect(await guestTripIds(profile.id)).toEqual([tripId]);
  });

  test("uses a default color when none is picked", async () => {
    await joinTrip(inviteId, "Guest");

    const profile = await createdAnonymousGuest();
    expect(profile.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  test("keeps an already anonymous user instead of creating another", async () => {
    const userId = await signInAsNewAnonymousUser();

    expect(await joinTrip(inviteId, "Guest")).toMatchObject({ success: true });

    expect(await createdAnonymousUserIds()).toEqual([]);
    const profile = await getProfile(userId);
    expect(profile).toMatchObject({ name: "Guest" });
    expect(await guestTripIds(profile!.id)).toEqual([tripId]);
  });

  test("keeps an existing profile's name and color", async () => {
    const guest = await createTestUser("Existing");
    users.push(guest);
    await signInAs(guest.email, TEST_PASSWORD);

    expect(await joinTrip(inviteId, "Other", "#FFFFFF")).toMatchObject({
      success: true,
    });

    expect(await createdAnonymousUserIds()).toEqual([]);
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
    expect(await createdAnonymousUserIds()).toEqual([]);
    expect(await guestTripIds(owner.profileId)).toEqual([]);
  });

  test("fails for an expired invite", async () => {
    const expired = await createInvite(
      tripId,
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    );

    expectTranslatedError(await joinTrip(expired, "Guest"), "invite_invalid");
  });

  test("fails for an unknown invite id", async () => {
    expectTranslatedError(
      await joinTrip(randomUUID(), "Guest"),
      "invite_invalid",
    );
    // The failed join rolls back, so no profile is left behind
    for (const userId of await createdAnonymousUserIds()) {
      expect(await getProfile(userId)).toBeNull();
    }
  });

  test.each(["", "   ", "x".repeat(51), " " + "x".repeat(50) + " "])(
    "rejects the invalid name %j",
    async (name) => {
      expectTranslatedError(await joinTrip(inviteId, name), "name_invalid");
      // Input is checked before anyone is signed in
      expect(await createdAnonymousUserIds()).toEqual([]);
    },
  );

  test.each(["red", "#FFF", "url(x)"])(
    "rejects the invalid color %j",
    async (color) => {
      expectTranslatedError(
        await joinTrip(inviteId, "Guest", color),
        "color_invalid",
      );
      expect(await createdAnonymousUserIds()).toEqual([]);
    },
  );
});
