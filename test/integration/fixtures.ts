import { randomUUID } from "node:crypto";
import { createAdminClient } from "./admin-client";

const admin = createAdminClient();

export const TEST_PASSWORD = "password123";

// Required trip columns, so inserts only fail for the reason a test checks
export const TEST_TRIP = {
  name: "Testreise",
  start_date: "2026-07-01T00:00:00Z",
  end_date: "2026-07-08T00:00:00Z",
};

export type TestUser = { userId: string; profileId: string; email: string };

// Creates an auth user with a profile. Uses the admin client, so RLS is skipped.
export async function createTestUser(name = "Test"): Promise<TestUser> {
  const email = `${randomUUID()}@huddle.test`;
  const user = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (user.error) throw user.error;

  const { data: profile, error } = await admin
    .from("profile")
    .insert({ user_id: user.data.user.id, name, color: "#E0A526" })
    .select("id")
    .single();
  if (error) throw error;

  return { userId: user.data.user.id, profileId: profile.id, email };
}

export async function createTestTrip(owner: TestUser, guests: TestUser[] = []) {
  const { data: trip, error } = await admin
    .from("trip")
    .insert({ ...TEST_TRIP, owner_id: owner.profileId })
    .select("id")
    .single();
  if (error) throw error;

  if (guests.length > 0) {
    const { error: guestError } = await admin.from("guest_trip").insert(
      guests.map((guest) => ({
        profile_id: guest.profileId,
        trip_id: trip.id,
      })),
    );
    if (guestError) throw guestError;
  }

  return trip.id as string;
}

// Deletes the trips with everything in them, then the users (and through
// ON DELETE CASCADE their profiles)
export async function cleanUp(tripIds: string[], users: TestUser[]) {
  const { data: items } = await admin
    .from("shopping_list_item")
    .select("id")
    .in("trip_id", tripIds);
  const itemIds = (items ?? []).map((row) => row.id);

  await admin
    .from("shopping_list_history")
    .delete()
    .in("shopping_list_item_id", itemIds);
  await admin.from("shopping_list_item").delete().in("id", itemIds);
  await admin.from("trip_invite").delete().in("trip_id", tripIds);
  await admin.from("guest_trip").delete().in("trip_id", tripIds);
  await admin.from("trip").delete().in("id", tripIds);

  for (const user of users) {
    await admin.auth.admin.deleteUser(user.userId);
  }
}
