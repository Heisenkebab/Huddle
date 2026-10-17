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

  const history = await admin.from("shopping_list_history").insert({
    shopping_list_item_id: id,
    unit: body.unit,
    amount: body.amount,
  });
  if (history.error) throw history.error;

  return id;
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

describe("updateItem", () => {
  let tripId: string;
  let itemId: string;
  let owner: TestUser;

  // A trip needs an owner profile, and a profile needs an auth user
  beforeEach(async () => {
    owner = await createTestUser();
    tripId = await createTestTrip(owner);
    await signInAs(owner.email, TEST_PASSWORD);

    itemId = await seedItem(tripId);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    signOut();
    await cleanUp([tripId], [owner]);
  });

  test("update shopping list item and test lowercase + trim", async () => {
    const updated = await updateItem(itemId, tripId, {
      ...item,
      name: " cheese ",
      category: Category.OTHER,
      unit: Unit.AMOUNT,
    });
    expect(updated.success).toBe(true);
    if (!updated.success) return;

    const createdItem = await getItem(itemId);

    expect(createdItem).toEqual({
      id: itemId,
      trip_id: tripId,
      name: "cheese",
      category: Category.OTHER,
    });

    const history = await getHistory(itemId);

    expect(history).toEqual([
      {
        shopping_list_item_id: itemId,
        unit: Unit.AMOUNT,
        amount: 2,
        bought_at: null,
        removed_at: null,
      },
    ]);
  });
  test("update shopping list item but only the name and category", async () => {
    const updated = await updateItem(itemId, tripId, {
      ...item,
      name: " cheese ",
      category: Category.OTHER,
    });
    expect(updated.success).toBe(true);
    if (!updated.success) return;

    const createdItem = await getItem(itemId);

    expect(createdItem).toEqual({
      id: itemId,
      trip_id: tripId,
      name: "cheese",
      category: Category.OTHER,
    });

    const history = await getHistory(itemId);

    expect(history).toEqual([
      {
        shopping_list_item_id: itemId,
        unit: Unit.LITER,
        amount: 2,
        bought_at: null,
        removed_at: null,
      },
    ]);
  });
  test("update shopping list item but only the unit and value", async () => {
    const updated = await updateItem(itemId, tripId, {
      ...item,
      unit: Unit.AMOUNT,
      amount: 5,
    });
    expect(updated.success).toBe(true);
    if (!updated.success) return;

    const createdItem = await getItem(itemId);

    expect(createdItem).toEqual({
      id: itemId,
      trip_id: tripId,
      name: "Milk",
      category: Category.CHILLED,
    });

    const history = await getHistory(itemId);

    expect(history).toEqual([
      {
        shopping_list_item_id: itemId,
        unit: Unit.AMOUNT,
        amount: 5,
        bought_at: null,
        removed_at: null,
      },
    ]);
  });
  test("update shopping list item from another trip", async () => {});
  test("update shopping list item that does not exist", async () => {});
  test("update shopping list item that in the past was bought", async () => {});
});
