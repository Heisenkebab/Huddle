import { createAdminClient } from "@/test/integration/admin-client";
import {
  cleanUp,
  createTestTrip,
  createTestUser,
  TEST_PASSWORD,
  TestUser,
} from "@/test/integration/fixtures";
import { silenceErrorLog } from "@/test/integration/console";
import { signInAs, signOut } from "@/test/integration/session";

import { getHistory } from "@/test/integration/shopping-list";
import { Category, ShoppingListItemBody, Unit } from "@/types/shopping-list";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createItem } from "./create-item";

const admin = createAdminClient();

const item: ShoppingListItemBody = {
  name: "Milk",
  category: Category.CHILLED,
  unit: Unit.LITER,
  amount: 2,
};

describe("createItem", () => {
  let owner: TestUser;
  let tripId: string;

  beforeEach(async () => {
    owner = await createTestUser();
    tripId = await createTestTrip(owner);
    await signInAs(owner.email, TEST_PASSWORD);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    signOut();
    await cleanUp([tripId], [owner]);
  });

  test("creates the item in the trip and returns the new entry", async () => {
    const result = await createItem(tripId, item);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data).toEqual({
      id: expect.any(String),
      shopping_list_item_id: expect.any(String),
      unit: Unit.LITER,
      amount: 2,
      shopping_list_item: {
        id: result.data.shopping_list_item_id,
        category: Category.CHILLED,
        name: "Milk",
      },
      merged: false,
    });

    const { data: created } = await admin
      .from("shopping_list_item")
      .select("id, trip_id, name, category")
      .eq("id", result.data.shopping_list_item_id)
      .single();

    expect(created).toEqual({
      id: result.data.shopping_list_item_id,
      trip_id: tripId,
      name: "Milk",
      category: Category.CHILLED,
    });
  });

  test("opens a history entry with the unit and amount", async () => {
    const result = await createItem(tripId, item);
    if (!result.success) throw new Error(result.error);

    expect(await getHistory(result.data.shopping_list_item_id)).toEqual([
      {
        shopping_list_item_id: result.data.shopping_list_item_id,
        unit: Unit.LITER,
        amount: 2,
        bought_at: null,
        removed_at: null,
      },
    ]);
  });

  test("reuses the existing item when it is added again after being bought", async () => {
    const first = await createItem(tripId, item);
    if (!first.success) throw new Error(first.error);

    await admin
      .from("shopping_list_history")
      .update({ bought_at: new Date().toISOString() })
      .eq("shopping_list_item_id", first.data.shopping_list_item_id);

    const second = await createItem(tripId, {
      ...item,
      name: "  milk ",
      amount: 1,
    });
    if (!second.success) throw new Error(second.error);

    expect(second.data.shopping_list_item_id).toBe(
      first.data.shopping_list_item_id,
    );

    const history = await getHistory(first.data.shopping_list_item_id);
    expect(history).toHaveLength(2);
    expect(history[1]).toMatchObject({ amount: 1, bought_at: null });
  });

  test("merges the amount into the open entry when the item is added again", async () => {
    const first = await createItem(tripId, item);
    if (!first.success) throw new Error(first.error);

    const second = await createItem(tripId, {
      ...item,
      name: "  milk ",
      amount: 1,
    });
    if (!second.success) throw new Error(second.error);

    expect(second.data).toMatchObject({
      id: first.data.id,
      shopping_list_item_id: first.data.shopping_list_item_id,
      unit: Unit.LITER,
      amount: 3,
      merged: true,
    });
    expect(await getHistory(first.data.shopping_list_item_id)).toEqual([
      expect.objectContaining({ unit: Unit.LITER, amount: 3, bought_at: null }),
    ]);
  });

  test("converts the added amount into the open entry's unit", async () => {
    const first = await createItem(tripId, item);
    if (!first.success) throw new Error(first.error);

    const second = await createItem(tripId, {
      ...item,
      unit: Unit.MILLILITER,
      amount: 500,
    });
    if (!second.success) throw new Error(second.error);

    expect(second.data).toMatchObject({
      unit: Unit.LITER,
      amount: 2.5,
      merged: true,
    });
  });

  test("fails and keeps the open entry when the units can't be combined", async () => {
    const first = await createItem(tripId, item);
    if (!first.success) throw new Error(first.error);

    const second = await createItem(tripId, {
      ...item,
      unit: Unit.AMOUNT,
      amount: 3,
    });

    expect(second).toEqual({
      success: false,
      error: "Item is already on the list in a different unit",
    });
    expect(await getHistory(first.data.shopping_list_item_id)).toEqual([
      expect.objectContaining({ unit: Unit.LITER, amount: 2 }),
    ]);
  });

  test.each([
    { unit: Unit.GRAM, amount: 200.2 },
    { unit: Unit.MILLILITER, amount: 0.5 },
    { unit: Unit.AMOUNT, amount: 2.5 },
    { unit: Unit.KILOGRAM, amount: 1.2345 },
    { unit: Unit.LITER, amount: 0 },
    { unit: Unit.LITER, amount: -1 },
  ])("fails and writes nothing for $amount $unit", async ({ unit, amount }) => {
    const result = await createItem(tripId, { ...item, unit, amount });

    expect(result).toEqual({
      success: false,
      error: "Invalid amount for this unit",
    });
    const { count } = await admin
      .from("shopping_list_item")
      .select("*", { count: "exact", head: true })
      .eq("trip_id", tripId);
    expect(count).toBe(0);
  });

  test("accepts kilograms with three decimals", async () => {
    const result = await createItem(tripId, {
      ...item,
      unit: Unit.KILOGRAM,
      amount: 1.234,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toMatchObject({ unit: Unit.KILOGRAM, amount: 1.234 });
  });

  test("fails and keeps the open entry when a negative amount is merged", async () => {
    const first = await createItem(tripId, item);
    if (!first.success) throw new Error(first.error);

    const second = await createItem(tripId, { ...item, amount: -1 });

    expect(second).toEqual({
      success: false,
      error: "Invalid amount for this unit",
    });
    expect(await getHistory(first.data.shopping_list_item_id)).toEqual([
      expect.objectContaining({ unit: Unit.LITER, amount: 2 }),
    ]);
  });

  test("fails and keeps the open entry when the merged amount is too big", async () => {
    const grams = { ...item, unit: Unit.GRAM, amount: 6000 };
    const first = await createItem(tripId, grams);
    if (!first.success) throw new Error(first.error);

    const second = await createItem(tripId, { ...grams, amount: 5000 });

    expect(second).toEqual({
      success: false,
      error: "Invalid amount for this unit",
    });
    expect(await getHistory(first.data.shopping_list_item_id)).toEqual([
      expect.objectContaining({ unit: Unit.GRAM, amount: 6000 }),
    ]);
  });

  test("fails and writes nothing when the trip does not exist", async () => {
    silenceErrorLog();

    const before = await admin
      .from("shopping_list_item")
      .select("*", { count: "exact", head: true });

    const result = await createItem(randomUUID(), item);

    const after = await admin
      .from("shopping_list_item")
      .select("*", { count: "exact", head: true });

    expect(result).toEqual({ success: false, error: "Failed to create item" });
    expect(after.count).toBe(before.count);
  });
});
