import { createItem } from "@/app/trip/[id]/shopping-list/_actions/create-item";
import { Database } from "@/types/database.types";
import { Category, Unit } from "@/types/shopping-list";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import { createAdminClient } from "./admin-client";
import {
  cleanUp,
  createTestTrip,
  createTestUser,
  TEST_PASSWORD,
  TEST_TRIP,
  TestUser,
} from "./fixtures";
import {
  createSessionClient,
  signInAnonymously,
  signInAs,
  signOut,
  useAccessToken,
} from "./session";
import { getHistory } from "./shopping-list";

const admin = createAdminClient();

// owner + guest are in the trip, outsider is not
let owner: TestUser;
let guest: TestUser;
let outsider: TestUser;
let tripId: string;
let itemId: string;
// Trips created through the API during the tests, cleaned up at the end
const createdTripIds: string[] = [];
// Guest who joined the trip through an anonymous sign-in
let anonymousGuest: TestUser;
let anonymousToken: string;

beforeAll(async () => {
  owner = await createTestUser("Owner");
  guest = await createTestUser("Guest");
  outsider = await createTestUser("Outsider");
  tripId = await createTestTrip(owner, [guest]);

  const { data: item, error } = await admin
    .from("shopping_list_item")
    .insert({ trip_id: tripId, name: "Milch", category: Category.CHILLED })
    .select("id")
    .single();
  if (error) throw error;
  itemId = item.id;

  await admin
    .from("shopping_list_history")
    .insert({ shopping_list_item_id: itemId, unit: Unit.LITER, amount: 2 });
  await admin
    .from("trip_invite")
    .insert({ trip_id: tripId, invite_id: crypto.randomUUID() });
});

afterEach(() => {
  vi.restoreAllMocks();
  signOut();
});

afterAll(async () => {
  await cleanUp(
    [tripId, ...createdTripIds],
    [owner, guest, outsider, anonymousGuest].filter(Boolean),
  );
});

async function visibleRows(table: keyof Database["public"]["Tables"]) {
  const { data, error } = await createSessionClient().from(table).select("*");
  if (error) throw error;
  return data;
}

describe("anonymous visitor", () => {
  test("sees no trips, items or profiles", async () => {
    expect(await visibleRows("trip")).toEqual([]);
    expect(await visibleRows("shopping_list_item")).toEqual([]);
    expect(await visibleRows("profile")).toEqual([]);
  });
});

describe("outsider", () => {
  test("sees nothing of the trip", async () => {
    await signInAs(outsider.email, TEST_PASSWORD);

    expect(await visibleRows("trip")).toEqual([]);
    expect(await visibleRows("shopping_list_item")).toEqual([]);
    expect(await visibleRows("shopping_list_history")).toEqual([]);
    expect(await visibleRows("trip_invite")).toEqual([]);
    expect(await visibleRows("guest_trip")).toEqual([]);
  });

  test("only sees their own profile", async () => {
    await signInAs(outsider.email, TEST_PASSWORD);

    const profiles = await visibleRows("profile");
    expect(profiles.map((p) => p.id)).toEqual([outsider.profileId]);
  });

  test("cannot set a profile colour that isn't a hex colour", async () => {
    await signInAs(outsider.email, TEST_PASSWORD);

    const { error } = await createSessionClient()
      .from("profile")
      .update({ color: "url(https://attacker.example/t)" })
      .eq("id", outsider.profileId);

    expect(error?.code).toBe("23514");
  });

  test("cannot add an item to the trip", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await signInAs(outsider.email, TEST_PASSWORD);

    const result = await createItem(tripId, {
      name: "Bier",
      category: Category.DRINKS,
      unit: Unit.AMOUNT,
      amount: 1,
    });

    expect(result.success).toBe(false);
  });

  test.each([
    {
      fn: "remove_shopping_list_item",
      args: () => ({ p_item_id: itemId, p_trip_id: tripId }),
    },
    {
      fn: "set_shopping_list_item_bought",
      args: () => ({ p_trip_id: tripId, p_item_id: itemId, p_bought: true }),
    },
    {
      fn: "restore_removed_shopping_list_item",
      args: () => ({ p_trip_id: tripId, p_item_id: itemId }),
    },
  ] as const)("cannot call $fn on the trip", async ({ fn, args }) => {
    await signInAs(outsider.email, TEST_PASSWORD);

    const { error } = await createSessionClient().rpc(fn, args());

    expect(error?.code).toBe("42501");
    expect(await getHistory(itemId)).toEqual([
      expect.objectContaining({ bought_at: null, removed_at: null }),
    ]);
  });
});

describe("signed-in user", () => {
  test("can create a trip they own", async () => {
    await signInAs(outsider.email, TEST_PASSWORD);

    const { data, error } = await createSessionClient()
      .from("trip")
      .insert({ ...TEST_TRIP, owner_id: outsider.profileId })
      .select("id")
      .single();

    expect(error).toBeNull();
    createdTripIds.push(data!.id);
  });

  test("cannot create a trip for someone else", async () => {
    await signInAs(outsider.email, TEST_PASSWORD);

    const { error } = await createSessionClient()
      .from("trip")
      .insert({ ...TEST_TRIP, owner_id: owner.profileId });

    expect(error).not.toBeNull();
  });
});

describe("guest", () => {
  test("sees the trip, its items and history", async () => {
    await signInAs(guest.email, TEST_PASSWORD);

    expect((await visibleRows("trip")).map((t) => t.id)).toEqual([tripId]);
    expect((await visibleRows("shopping_list_item")).map((i) => i.id)).toEqual([
      itemId,
    ]);
    expect(await visibleRows("shopping_list_history")).toHaveLength(1);
  });

  test("sees the profiles of the trip's members", async () => {
    await signInAs(guest.email, TEST_PASSWORD);

    const ids = (await visibleRows("profile")).map((p) => p.id).sort();
    expect(ids).toEqual([owner.profileId, guest.profileId].sort());
  });

  test("can add an item to the trip", async () => {
    await signInAs(guest.email, TEST_PASSWORD);

    const result = await createItem(tripId, {
      name: "Brot",
      category: Category.PRODUCE,
      unit: Unit.AMOUNT,
      amount: 1,
    });

    expect(result.success).toBe(true);
  });

  // Writes only go through the RPCs, which validate the input
  test("cannot insert items or history directly", async () => {
    await signInAs(guest.email, TEST_PASSWORD);
    const client = createSessionClient();

    const item = await client
      .from("shopping_list_item")
      .insert({ trip_id: tripId, name: "a".repeat(500), category: "OTHER" });
    const history = await client
      .from("shopping_list_history")
      .insert({ shopping_list_item_id: itemId, unit: Unit.AMOUNT, amount: 1 });

    expect(item.error?.code).toBe("42501");
    expect(history.error?.code).toBe("42501");
  });

  test("cannot change or delete history directly", async () => {
    await signInAs(guest.email, TEST_PASSWORD);
    const client = createSessionClient();

    const update = await client
      .from("shopping_list_history")
      .update({ bought_at: new Date().toISOString() })
      .eq("shopping_list_item_id", itemId);
    const del = await client
      .from("shopping_list_history")
      .delete()
      .eq("shopping_list_item_id", itemId);

    expect(update.error?.code).toBe("42501");
    expect(del.error?.code).toBe("42501");
    expect(await getHistory(itemId)).toEqual([
      expect.objectContaining({ bought_at: null }),
    ]);
  });

  test("cannot regenerate the invite link", async () => {
    await signInAs(guest.email, TEST_PASSWORD);

    const { data, error } = await createSessionClient()
      .from("trip_invite")
      .update({ invite_id: crypto.randomUUID() })
      .eq("trip_id", tripId)
      .select("id");

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  test("cannot delete the trip", async () => {
    await signInAs(guest.email, TEST_PASSWORD);

    await createSessionClient().from("trip").delete().eq("id", tripId);

    const { data } = await admin.from("trip").select("id").eq("id", tripId);
    expect(data).toHaveLength(1);
  });

  test("cannot add another guest", async () => {
    await signInAs(guest.email, TEST_PASSWORD);

    const { error } = await createSessionClient()
      .from("guest_trip")
      .insert({ profile_id: outsider.profileId, trip_id: tripId });

    expect(error).not.toBeNull();
  });
});

describe("anonymous guest", () => {
  beforeAll(async () => {
    const session = await signInAnonymously();
    anonymousToken = session.accessToken;

    // Creating their own profile goes through RLS, so this also tests the
    // profile insert policy for anonymous users
    const { data: profile, error } = await createSessionClient()
      .from("profile")
      .insert({ user_id: session.userId, name: "Anonym", color: "#E0A526" })
      .select("id")
      .single();
    if (error) throw error;

    anonymousGuest = {
      userId: session.userId,
      profileId: profile.id,
      email: "",
    };

    // Joining will go through join_trip(); until then add them directly
    await admin
      .from("guest_trip")
      .insert({ profile_id: profile.id, trip_id: tripId });
    signOut();
  });

  test("sees the trip they joined", async () => {
    useAccessToken(anonymousToken);

    expect((await visibleRows("trip")).map((t) => t.id)).toEqual([tripId]);
  });

  test("can add an item to the trip", async () => {
    useAccessToken(anonymousToken);

    const result = await createItem(tripId, {
      name: "Chips",
      category: Category.PRODUCE,
      unit: Unit.AMOUNT,
      amount: 2,
    });

    expect(result.success).toBe(true);
  });

  test("cannot create a trip", async () => {
    useAccessToken(anonymousToken);

    const { error } = await createSessionClient()
      .from("trip")
      .insert({ ...TEST_TRIP, owner_id: anonymousGuest.profileId });

    expect(error).not.toBeNull();
  });
});
