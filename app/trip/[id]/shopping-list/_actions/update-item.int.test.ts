import { createAdminClient } from "@/test/integration/admin-client";
import {
  cleanUp,
  createTestTrip,
  createTestUser,
  TEST_PASSWORD,
  TestUser,
} from "@/test/integration/fixtures";
import { signInAs, signOut } from "@/test/integration/session";
import { getHistory } from "@/test/integration/shopping-list";
import { Category, ShoppingListItemBody, Unit } from "@/types/shopping-list";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { updateItem } from "./update-item";

const admin = createAdminClient();

const item: ShoppingListItemBody = {
  name: "Milk",
  category: Category.CHILLED,
  unit: Unit.LITER,
  amount: 2,
};

// Expected failures log through console.error; silence only those tests
function silenceErrorLog() {
  vi.spyOn(console, "error").mockImplementation(() => {});
}

async function seedItem(
  tripId: string,
  overrides: Partial<ShoppingListItemBody> = {},
) {
  const body = { ...item, ...overrides };
  const id = randomUUID();

  const created = await admin
    .from("shopping_list_item")
    .insert({ id, trip_id: tripId, name: body.name, category: body.category });
  if (created.error) throw created.error;

  await openEntry(id, body.unit, body.amount);

  return id;
}

async function openEntry(itemId: string, unit: Unit, amount: number) {
  const { error } = await admin
    .from("shopping_list_history")
    .insert({ shopping_list_item_id: itemId, unit, amount });
  if (error) throw error;
}

async function buyOpenEntry(itemId: string) {
  const { error } = await admin
    .from("shopping_list_history")
    .update({ bought_at: new Date().toISOString() })
    .eq("shopping_list_item_id", itemId)
    .is("bought_at", null)
    .is("removed_at", null);
  if (error) throw error;
}

async function getItem(itemId: string) {
  const { data, error } = await admin
    .from("shopping_list_item")
    .select("id, name, category, trip_id")
    .eq("id", itemId)
    .single();
  if (error) throw error;
  return data;
}

async function getOpenEntryId(itemId: string) {
  const { data, error } = await admin
    .from("shopping_list_history")
    .select("id")
    .eq("shopping_list_item_id", itemId)
    .is("bought_at", null)
    .is("removed_at", null)
    .single();
  if (error) throw error;
  return data.id;
}

describe("updateItem", () => {
  let tripId: string;
  let itemId: string;
  let owner: TestUser;
  let tripIds: string[];

  // A trip needs an owner profile, and a profile needs an auth user
  beforeEach(async () => {
    owner = await createTestUser();
    tripId = await createTestTrip(owner);
    tripIds = [tripId];
    await signInAs(owner.email, TEST_PASSWORD);

    itemId = await seedItem(tripId);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    signOut();
    await cleanUp(tripIds, [owner]);
  });

  test("updates every field, trims the name and returns the open entry", async () => {
    const result = await updateItem(itemId, tripId, {
      name: " cheese ",
      category: Category.OTHER,
      unit: Unit.AMOUNT,
      amount: 3,
    });

    expect(result).toEqual({
      success: true,
      data: {
        id: await getOpenEntryId(itemId),
        shopping_list_item_id: itemId,
        unit: Unit.AMOUNT,
        amount: 3,
        shopping_list_item: {
          id: itemId,
          category: Category.OTHER,
          name: "cheese",
        },
      },
    });

    expect(await getItem(itemId)).toEqual({
      id: itemId,
      trip_id: tripId,
      name: "cheese",
      category: Category.OTHER,
    });
    expect(await getHistory(itemId)).toEqual([
      {
        shopping_list_item_id: itemId,
        unit: Unit.AMOUNT,
        amount: 3,
        bought_at: null,
        removed_at: null,
      },
    ]);
  });

  test("updates only the name and category and still returns the entry", async () => {
    const result = await updateItem(itemId, tripId, {
      name: "Cheese",
      category: Category.OTHER,
    });

    expect(result).toEqual({
      success: true,
      data: {
        id: await getOpenEntryId(itemId),
        shopping_list_item_id: itemId,
        unit: Unit.LITER,
        amount: 2,
        shopping_list_item: {
          id: itemId,
          category: Category.OTHER,
          name: "Cheese",
        },
      },
    });

    expect(await getHistory(itemId)).toEqual([
      {
        shopping_list_item_id: itemId,
        unit: Unit.LITER,
        amount: 2,
        bought_at: null,
        removed_at: null,
      },
    ]);
  });

  test("updates only the unit and amount", async () => {
    const result = await updateItem(itemId, tripId, {
      unit: Unit.AMOUNT,
      amount: 5,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toMatchObject({
      unit: Unit.AMOUNT,
      amount: 5,
      shopping_list_item: { name: "Milk", category: Category.CHILLED },
    });

    expect(await getItem(itemId)).toEqual({
      id: itemId,
      trip_id: tripId,
      name: "Milk",
      category: Category.CHILLED,
    });
    expect(await getHistory(itemId)).toEqual([
      {
        shopping_list_item_id: itemId,
        unit: Unit.AMOUNT,
        amount: 5,
        bought_at: null,
        removed_at: null,
      },
    ]);
  });

  test("updates only the open entry of an item that was bought before", async () => {
    await buyOpenEntry(itemId);
    await openEntry(itemId, Unit.LITER, 1);

    const result = await updateItem(itemId, tripId, { amount: 4 });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toMatchObject({
      id: await getOpenEntryId(itemId),
      amount: 4,
    });

    const history = await getHistory(itemId);
    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({
      amount: 2,
      bought_at: expect.any(String),
    });
    expect(history[1]).toMatchObject({ amount: 4, bought_at: null });
  });

  test("fails when the item has no open entry", async () => {
    silenceErrorLog();
    await buyOpenEntry(itemId);

    const result = await updateItem(itemId, tripId, { amount: 4 });

    expect(result).toEqual({ success: false, error: "Failed to update item" });
    expect((await getHistory(itemId))[0]).toMatchObject({ amount: 2 });
  });

  test("fails and changes nothing when the item belongs to another trip", async () => {
    silenceErrorLog();
    const otherTripId = await createTestTrip(owner);
    tripIds.push(otherTripId);

    const result = await updateItem(itemId, otherTripId, {
      name: "Cheese",
      amount: 4,
    });

    expect(result).toEqual({ success: false, error: "Failed to update item" });
    expect(await getItem(itemId)).toMatchObject({ name: "Milk" });
    expect((await getHistory(itemId))[0]).toMatchObject({ amount: 2 });
  });

  test("fails when the item does not exist", async () => {
    silenceErrorLog();

    const result = await updateItem(randomUUID(), tripId, { name: "Cheese" });

    expect(result).toEqual({ success: false, error: "Failed to update item" });
  });
});
