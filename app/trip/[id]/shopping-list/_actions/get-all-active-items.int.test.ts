import { createAdminClient } from "@/test/integration/admin-client";
import {
  cleanUp,
  createTestTrip,
  createTestUser,
  TEST_PASSWORD,
  TestUser,
} from "@/test/integration/fixtures";
import { signInAs, signOut } from "@/test/integration/session";
import { ShoppingListItemBody, Unit } from "@/types/shopping-list";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createItem } from "./create-item";
import {
  GetActiveItemsResult,
  getAllActiveShoppingListItems,
} from "./get-all-active-items";
import { updateItem } from "./update-item";

const admin = createAdminClient();

const item: ShoppingListItemBody = {
  name: "Milk",
  category: "CHILLED",
  unit: "LITER",
  amount: 2,
};

// Bought items only show up for 2 days, so test dates are relative to now
function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

interface EntryOptions {
  createdAt?: string;
  unit?: Unit;
  amount?: number;
  bought?: boolean;
  removed?: boolean;
}

// created_at can be set explicitly, so which entry is the newest doesn't
// depend on rows inserted within the same millisecond
async function addEntry(itemId: string, options: EntryOptions = {}) {
  const closedAt = options.createdAt ?? new Date().toISOString();
  const { error } = await admin.from("shopping_list_history").insert({
    shopping_list_item_id: itemId,
    unit: options.unit ?? item.unit,
    amount: options.amount ?? item.amount,
    created_at: options.createdAt,
    bought_at: options.bought ? closedAt : null,
    removed_at: options.removed ? closedAt : null,
  });
  if (error) throw error;
}

// Creates an item together with its first history entry
async function seedItem(
  tripId: string,
  overrides: Partial<ShoppingListItemBody> = {},
  entry: EntryOptions = {},
) {
  const body = { ...item, ...overrides };
  const id = randomUUID();

  const { error } = await admin
    .from("shopping_list_item")
    .insert({ id, trip_id: tripId, name: body.name, category: body.category });
  if (error) throw error;

  await addEntry(id, { unit: body.unit, amount: body.amount, ...entry });

  return id;
}

async function getItems(tripId: string) {
  const result = await getAllActiveShoppingListItems(tripId);
  if (!result.success) throw new Error(result.error);
  return result.data;
}

async function getItemIds(tripId: string) {
  return (await getItems(tripId)).map((entry) => entry.id);
}

// Callers without access may get an empty list or an error; either way they
// must not see any items
function visibleItems(result: GetActiveItemsResult) {
  return result.success ? result.data : [];
}

describe("getAllActiveShoppingListItems", () => {
  let owner: TestUser;
  let users: TestUser[];
  let tripId: string;
  const tripIds: string[] = [];

  beforeEach(async () => {
    owner = await createTestUser();
    users = [owner];
    tripId = await createTestTrip(owner);
    tripIds.push(tripId);
    await signInAs(owner.email, TEST_PASSWORD);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    signOut();
    await cleanUp(tripIds.splice(0), users);
  });

  test("returns an open item with its name, category, unit and amount", async () => {
    const itemId = await seedItem(tripId);

    expect(await getItems(tripId)).toEqual([
      expect.objectContaining({
        id: itemId,
        trip_id: tripId,
        name: "Milk",
        category: "CHILLED",
        unit: "LITER",
        amount: 2,
        bought_at: null,
      }),
    ]);
  });

  test("returns a bought item with its bought date", async () => {
    const itemId = await seedItem(tripId, {}, { bought: true });

    const [entry] = await getItems(tripId);

    expect(entry.id).toBe(itemId);
    expect(entry.bought_at).not.toBeNull();
  });

  test("returns an item that was bought less than 2 days ago", async () => {
    const itemId = await seedItem(
      tripId,
      {},
      { createdAt: hoursAgo(47), bought: true },
    );

    expect(await getItemIds(tripId)).toEqual([itemId]);
  });

  test("does not return an item that was bought more than 2 days ago", async () => {
    await seedItem(tripId, {}, { createdAt: hoursAgo(49), bought: true });
    const openId = await seedItem(tripId, { name: "Bread" });

    expect(await getItemIds(tripId)).toEqual([openId]);
  });

  test("returns an open item no matter how old it is", async () => {
    const itemId = await seedItem(tripId, {}, { createdAt: hoursAgo(24 * 7) });

    expect(await getItemIds(tripId)).toEqual([itemId]);
  });

  test("returns open and bought items together", async () => {
    const openId = await seedItem(
      tripId,
      { name: "Bread" },
      { createdAt: hoursAgo(3) },
    );
    const boughtId = await seedItem(
      tripId,
      {},
      { createdAt: hoursAgo(2), bought: true },
    );

    expect(await getItemIds(tripId)).toEqual([openId, boughtId]);
  });

  test("does not return an item that was removed", async () => {
    await seedItem(tripId, {}, { removed: true });
    const openId = await seedItem(tripId, { name: "Bread" });

    expect(await getItemIds(tripId)).toEqual([openId]);
  });

  test("returns an item once, as open, when it was bought and added again", async () => {
    const itemId = await seedItem(
      tripId,
      {},
      { createdAt: hoursAgo(3), amount: 1, bought: true },
    );
    await addEntry(itemId, { createdAt: hoursAgo(2), amount: 3 });

    expect(await getItems(tripId)).toEqual([
      expect.objectContaining({ id: itemId, amount: 3, bought_at: null }),
    ]);
  });

  test("returns only the newest entry of an item that was bought twice", async () => {
    const itemId = await seedItem(
      tripId,
      {},
      { createdAt: hoursAgo(3), unit: "LITER", amount: 1, bought: true },
    );
    await addEntry(itemId, {
      createdAt: hoursAgo(2),
      unit: "MILLILITER",
      amount: 500,
      bought: true,
    });

    const items = await getItems(tripId);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ unit: "MILLILITER", amount: 500 });
    expect(items[0].bought_at).not.toBeNull();
  });

  test("returns an item as open when it was removed and added again", async () => {
    const itemId = await seedItem(
      tripId,
      {},
      { createdAt: hoursAgo(3), removed: true },
    );
    await addEntry(itemId, { createdAt: hoursAgo(2) });

    expect(await getItems(tripId)).toEqual([
      expect.objectContaining({ id: itemId, bought_at: null }),
    ]);
  });

  // The removed entry is the newest, so the older bought entry must not show up
  test("does not return an item that was bought, added again and then removed", async () => {
    const itemId = await seedItem(
      tripId,
      {},
      { createdAt: hoursAgo(3), bought: true },
    );
    await addEntry(itemId, { createdAt: hoursAgo(2), removed: true });

    expect(await getItemIds(tripId)).toEqual([]);
  });

  test("does not return items of other trips", async () => {
    const ownId = await seedItem(tripId);
    const otherTripId = await createTestTrip(owner);
    tripIds.push(otherTripId);
    await seedItem(otherTripId, { name: "Bread" });

    expect(await getItemIds(tripId)).toEqual([ownId]);
  });

  test("returns an empty list for a trip without items", async () => {
    expect(await getAllActiveShoppingListItems(tripId)).toEqual({
      success: true,
      data: [],
    });
  });

  test("returns an empty list for a trip that does not exist", async () => {
    expect(await getAllActiveShoppingListItems(randomUUID())).toEqual({
      success: true,
      data: [],
    });
  });

  test("returns the amount as a number, keeping decimals", async () => {
    await seedItem(tripId, { unit: "KILOGRAM", amount: 1.5 });

    const [entry] = await getItems(tripId);

    expect(entry.amount).toBe(1.5);
  });

  test("returns the items oldest first", async () => {
    const newest = await seedItem(
      tripId,
      { name: "Cheese" },
      { createdAt: hoursAgo(1) },
    );
    const oldest = await seedItem(
      tripId,
      { name: "Milk" },
      { createdAt: hoursAgo(3) },
    );
    const middle = await seedItem(
      tripId,
      { name: "Bread" },
      { createdAt: hoursAgo(2) },
    );

    expect(await getItemIds(tripId)).toEqual([oldest, middle, newest]);
  });

  test("returns the name and color of the user who added the item", async () => {
    const created = await createItem(tripId, item);
    if (!created.success) throw new Error(created.error);

    expect(await getItems(tripId)).toEqual([
      expect.objectContaining({
        created_by: owner.profileId,
        created_by_name: "Test",
        created_by_color: "#E0A526",
      }),
    ]);
  });

  test("returns the name and color of the user who last changed the item", async () => {
    const guest = await createTestUser("Guest");
    users.push(guest);
    const guestTripId = await createTestTrip(owner, [guest]);
    tripIds.push(guestTripId);
    const created = await createItem(guestTripId, item);
    if (!created.success) throw new Error(created.error);
    await signInAs(guest.email, TEST_PASSWORD);
    const updated = await updateItem(
      guestTripId,
      created.data.shopping_list_item_id,
      { amount: 3 },
    );
    if (!updated.success) throw new Error(updated.error);

    expect(await getItems(guestTripId)).toEqual([
      expect.objectContaining({
        created_by_name: "Test",
        updated_by: guest.profileId,
        updated_by_name: "Guest",
        updated_by_color: "#E0A526",
      }),
    ]);
  });

  // Items written by the service role have no author, but must still show up
  test("returns an item without an author, with null name and color", async () => {
    const itemId = await seedItem(tripId);

    expect(await getItems(tripId)).toEqual([
      expect.objectContaining({
        id: itemId,
        created_by: null,
        created_by_name: null,
        created_by_color: null,
        updated_by: null,
        updated_by_name: null,
        updated_by_color: null,
      }),
    ]);
  });

  test("lets a guest of the trip see its items", async () => {
    const guest = await createTestUser("Guest");
    users.push(guest);
    const guestTripId = await createTestTrip(owner, [guest]);
    tripIds.push(guestTripId);
    const itemId = await seedItem(guestTripId);
    await signInAs(guest.email, TEST_PASSWORD);

    expect(await getItemIds(guestTripId)).toEqual([itemId]);
  });

  test("shows no items to a user outside the trip", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await seedItem(tripId);
    const stranger = await createTestUser("Stranger");
    users.push(stranger);
    await signInAs(stranger.email, TEST_PASSWORD);

    expect(visibleItems(await getAllActiveShoppingListItems(tripId))).toEqual(
      [],
    );
  });

  test("shows no items to anonymous callers", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await seedItem(tripId);
    signOut();

    expect(visibleItems(await getAllActiveShoppingListItems(tripId))).toEqual(
      [],
    );
  });
});
