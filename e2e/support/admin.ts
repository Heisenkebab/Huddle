import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

import { Database } from "@/types/database.types";

export const OWNER_NAME = "Owner";
export const TEST_TRIP = {
  name: "Testreise",
  start_date: "2026-07-01",
  end_date: "2026-07-08",
};

// Reads the URL and keys of the running local Supabase stack, like
// test/integration/global-setup.ts (vitest's inject() isn't available here)
function supabaseEnv(): Record<string, string> {
  let output: string;
  try {
    output = execSync("npx supabase status -o env", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    throw new Error(
      "Local Supabase is not running. Start it with `npx supabase start`.",
    );
  }

  return Object.fromEntries(
    output
      .split("\n")
      .map((line) => line.match(/^(\w+)="(.*)"$/))
      .filter((match) => match !== null)
      .map(([, key, value]) => [key, value]),
  );
}

export const env = supabaseEnv();

// Secret-key client for seeding and cleaning up test data. Bypasses RLS,
// so only use it for test setup, never to act as the user under test.
export const admin = createClient<Database>(env.API_URL, env.SECRET_KEY, {
  auth: { persistSession: false },
});

export type SeededTrip = {
  tripId: string;
  inviteId: string;
  ownerUserId: string;
  ownerEmail: string;
};

// Creates an owner with a profile, a trip and an invite link for it.
// ending_at defaults to the DB's (now + 7 days) unless overridden.
export async function seedTripWithInvite(
  opts: { endingAt?: string } = {},
): Promise<SeededTrip> {
  const ownerEmail = `${randomUUID()}@huddle.test`;
  const { data: user, error: userError } = await admin.auth.admin.createUser({
    email: ownerEmail,
    password: "password123",
    email_confirm: true,
  });
  if (userError) throw userError;

  const { data: profile } = await admin
    .from("profile")
    .insert({ user_id: user.user.id, name: OWNER_NAME, color: "#E0A526" })
    .select("id")
    .single()
    .throwOnError();

  const { data: trip } = await admin
    .from("trip")
    .insert({ ...TEST_TRIP, owner_id: profile.id })
    .select("id")
    .single()
    .throwOnError();

  const { data: invite } = await admin
    .from("trip_invite")
    .insert({
      trip_id: trip.id,
      ...(opts.endingAt ? { ending_at: opts.endingAt } : {}),
    })
    .select("invite_id")
    .single()
    .throwOnError();

  return {
    tripId: trip.id,
    inviteId: invite.invite_id,
    ownerUserId: user.user.id,
    ownerEmail,
  };
}

// Deletes the trip with everything in it, the owner and the anonymous users
// the browser created by joining (their profiles go through ON DELETE CASCADE)
export async function cleanUpTrip({ tripId, ownerUserId }: SeededTrip) {
  const { data: guests } = await admin
    .from("guest_trip")
    .select("profile:profile_id(user_id)")
    .eq("trip_id", tripId);

  const { data: items } = await admin
    .from("shopping_list_item")
    .select("id")
    .eq("trip_id", tripId);
  const itemIds = (items ?? []).map((item) => item.id);

  await admin
    .from("shopping_list_history")
    .delete()
    .in("shopping_list_item_id", itemIds);
  await admin.from("shopping_list_item").delete().eq("trip_id", tripId);
  await admin.from("trip_invite").delete().eq("trip_id", tripId);
  await admin.from("guest_trip").delete().eq("trip_id", tripId);
  await admin.from("trip").delete().eq("id", tripId);

  for (const guest of guests ?? []) {
    if (guest.profile) await admin.auth.admin.deleteUser(guest.profile.user_id);
  }
  await admin.auth.admin.deleteUser(ownerUserId);
}

export type TestUser = { userId: string; email: string };

export const TEST_PASSWORD = "password123";

// Creates a confirmed email/password user without a profile
export async function createUser(): Promise<TestUser> {
  const email = `${randomUUID()}@huddle.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  return { userId: data.user.id, email };
}

// Creates a user with a profile, the way someone who already uses the app is
export async function createUserWithProfile(name: string, color = "#3B82F6") {
  const user = await createUser();
  const { data: profile } = await admin
    .from("profile")
    .insert({ user_id: user.userId, name, color })
    .select("id")
    .single()
    .throwOnError();
  return { ...user, profileId: profile.id as string };
}

export async function addGuest(tripId: string, profileId: string) {
  await admin
    .from("guest_trip")
    .insert({ trip_id: tripId, profile_id: profileId })
    .throwOnError();
}

// The profile of a user, null if they have none
export async function profileOf(userId: string) {
  const { data } = await admin
    .from("profile")
    .select("id, name, color")
    .eq("user_id", userId)
    .maybeSingle()
    .throwOnError();
  return data;
}

// user_id of every guest of the trip, to check who actually joined
export async function guestUserIds(tripId: string) {
  const { data } = await admin
    .from("guest_trip")
    .select("profile:profile_id(user_id)")
    .eq("trip_id", tripId)
    .throwOnError();
  return data.flatMap((row) => (row.profile ? [row.profile.user_id] : []));
}

// For users a test created that aren't a guest of the trip (cleanUpTrip
// only removes those). Deleting twice is harmless.
export async function deleteUsers(userIds: string[]) {
  for (const userId of userIds) {
    await admin.auth.admin.deleteUser(userId);
  }
}

export function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}
