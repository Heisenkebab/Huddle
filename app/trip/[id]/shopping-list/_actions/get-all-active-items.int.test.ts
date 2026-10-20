import { createAdminClient } from "@/test/integration/admin-client";
import {
  cleanUp,
  createTestTrip,
  createTestUser,
  TEST_PASSWORD,
  TestUser,
} from "@/test/integration/fixtures";
import { signInAs, signOut } from "@/test/integration/session";
import { ShoppingListItemBody } from "@/types/shopping-list";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  GetActiveItemsResult,
  getAllActiveShoppingListItems,
} from "./get-all-active-items";

const admin = createAdminClient();

const item: ShoppingListItemBody = {
  name: "Milk",
  category: "CHILLED",
  unit: "LITER",
  amount: 2,
};

// created_at can be set explicitly, so the order of entries doesn't depend on
// rows inserted within the same millisecond
async function seedItem(
  tripId: string,
  overrides: Partial<ShoppingListItemBody> = {},
  createdAt?: string,
) {
  const body = { ...item, ...overrides };
  const id = randomUUID();

  const created = await admin
    .from("shopping_list_item")
    .insert({ id, trip_id: tripId, name: body.name, category: body.category });
  if (created.error) throw created.error;

  const { error } = await admin.from("shopping_list_history").insert({
    shopping_list_item_id: id,
    unit: body.unit,
    amount: body.amount,
    created_at: createdAt,
  });
  if (error) throw error;

  return id;
}

async function closeOpenEntry(
  itemId: string,
  column: "bought_at" | "removed_at",
) {
  const { error } = await admin
    .from("shopping_list_history")
    .update(
      column === "bought_at"
        ? { bought_at: new Date().toISOString() }
        : { removed_at: new Date().toISOString() },
    )
    .eq("shopping_list_item_id", itemId)
    .is("bought_at", null)
    .is("removed_at", null);
  if (error) throw error;
}

async function getActiveItemIds(tripId: string) {
  const result = await getAllActiveShoppingListItems(tripId);
  if (!result.success) throw new Error(result.error);
  return result.data.map((entry) => entry.shopping_list_item_id);
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

  test("returns the open items of the trip with unit, amount and item", async () => {
    const itemId = await seedItem(tripId);

    const result = await getAllActiveShoppingListItems(tripId);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toEqual([
      expect.objectContaining({
        shopping_list_item_id: itemId,
        unit: "LITER",
        amount: 2,
        bought_at: null,
        removed_at: null,
        shopping_list_item: {
          id: itemId,
          category: "CHILLED",
          name: "Milk",
        },
      }),
    ]);
  });

  test("does not return items that were marked as bought", async () => {
    const boughtId = await seedItem(tripId);
    const openId = await seedItem(tripId, { name: "Bread" });
    await closeOpenEntry(boughtId, "bought_at");

    expect(await getActiveItemIds(tripId)).toEqual([openId]);
  });

  test("does not return items that were removed", async () => {
    const removedId = await seedItem(tripId);
    const openId = await seedItem(tripId, { name: "Bread" });
    await closeOpenEntry(removedId, "removed_at");

    expect(await getActiveItemIds(tripId)).toEqual([openId]);
  });

  test("does not return items of other trips", async () => {
    const ownId = await seedItem(tripId);
    const otherTripId = await createTestTrip(owner);
    tripIds.push(otherTripId);
    await seedItem(otherTripId, { name: "Bread" });

    expect(await getActiveItemIds(tripId)).toEqual([ownId]);
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

    const result = await getAllActiveShoppingListItems(tripId);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data[0].amount).toBe(1.5);
  });

  test("returns the items oldest first", async () => {
    const newest = await seedItem(
      tripId,
      { name: "Cheese" },
      "2026-07-03T10:00:00Z",
    );
    const oldest = await seedItem(
      tripId,
      { name: "Milk" },
      "2026-07-01T10:00:00Z",
    );
    const middle = await seedItem(
      tripId,
      { name: "Bread" },
      "2026-07-02T10:00:00Z",
    );

    expect(await getActiveItemIds(tripId)).toEqual([oldest, middle, newest]);
  });

  test("lets a guest of the trip see its items", async () => {
    const guest = await createTestUser("Guest");
    users.push(guest);
    const guestTripId = await createTestTrip(owner, [guest]);
    tripIds.push(guestTripId);
    const itemId = await seedItem(guestTripId);
    await signInAs(guest.email, TEST_PASSWORD);

    expect(await getActiveItemIds(guestTripId)).toEqual([itemId]);
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
