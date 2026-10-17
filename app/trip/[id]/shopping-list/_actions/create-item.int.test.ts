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
import { createItem } from "./create-item";

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

  test("fails when the item already has an open entry", async () => {
    silenceErrorLog();

    const first = await createItem(tripId, item);
    if (!first.success) throw new Error(first.error);

    const second = await createItem(tripId, item);

    expect(second).toEqual({ success: false, error: "Failed to create item" });
    expect(await getHistory(first.data.shopping_list_item_id)).toHaveLength(1);
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
