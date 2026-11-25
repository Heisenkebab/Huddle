// KAN-98: accounts can only be created with a valid invite or by the server.
// Covers the before-user-created hook, the trip insert policy and securing a
// guest account with the instance password (KAN-91).
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  inject,
  test,
  vi,
} from "vitest";

import { Database } from "@/types/database.types";

import { createAdminClient } from "./admin-client";
import { cleanUp, createTestTrip, createTestUser, TestUser } from "./fixtures";
import { signOut } from "./session";

const admin = createAdminClient();

const TEST_INSTANCE_PASSWORD = "instance-password-123";

let owner: TestUser;
let tripId: string;
// Valid invite for tripId; tests that need an expired one create their own
let inviteId: string;
// Auth users created by the code under test, deleted at the end. They may
// have no profile, so cleanUp() (which takes TestUsers) doesn't fit.
const createdUserIds: string[] = [];

// Publishable key without a session: what anyone on the internet can call
function createPublicClient() {
  return createClient<Database>(
    inject("supabaseUrl"),
    inject("supabasePublishableKey"),
    { auth: { persistSession: false } },
  );
}

async function createInvite(endingAt?: string) {
  const { data, error } = await admin
    .from("trip_invite")
    .insert({ trip_id: tripId, ...(endingAt ? { ending_at: endingAt } : {}) })
    .select("invite_id")
    .single();
  if (error) throw error;
  return data.invite_id as string;
}

// Rejected sign-ups must not leave a row in auth.users
async function userExistsWithEmail(email: string) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users.some((user) => user.email === email);
}

async function anonymousUserCount() {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users.filter((user) => user.is_anonymous).length;
}

function uniqueEmail() {
  return `${randomUUID()}@huddle.test`;
}

beforeAll(async () => {
  owner = await createTestUser("Owner");
  tripId = await createTestTrip(owner);
  inviteId = await createInvite();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  signOut();
});

afterAll(async () => {
  for (const userId of createdUserIds) {
    await admin.auth.admin.deleteUser(userId);
  }
  await cleanUp([tripId], [owner]);
});

describe("anonymous sign-in", () => {
  test.todo("without invite token is rejected, no auth.users row");
  test.todo("with made-up invite token is rejected");
  test.todo("with expired / revoked invite token is rejected");
  test.todo("with valid invite token succeeds");
});

describe("email sign-up with the publishable key", () => {
  test.todo("signUp() is rejected");
  test.todo("signUp() with options.data.created_by_server = true is rejected");
});

describe("account created by the server", () => {
  test.todo("admin.createUser with app_metadata.created_by_server succeeds");
});

describe("creating a trip", () => {
  test.todo("anonymous guest is blocked by RLS");
  test.todo("guest who upgraded via updateUser directly is still blocked");
});

describe("securing a guest account", () => {
  // vi.stubEnv("INSTANCE_PASSWORD", TEST_INSTANCE_PASSWORD) where needed
  test.todo("without instance password is rejected");
  test.todo(
    "with instance password succeeds, keeps user id and entries, and can create a trip",
  );
});
