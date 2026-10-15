import { createAdminClient } from "@/test/integration/admin-client";
import { Category, ShoppingListItemBody, Unit } from "@/types/shopping-list";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createItem } from "./create-item";

const admin = createAdminClient();

const item: ShoppingListItemBody = {
  name: "Milk",
  category: Category.DAIRY,
  unit: Unit.LITER,
  amount: 2,
};

describe("createItem", () => {
  let tripId: string;

  beforeEach(async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    tripId = randomUUID();
    const { error } = await admin
      .from("trip")
      .insert({ id: tripId, invite_id: randomUUID() });
    if (error) throw error;
  });

  afterEach(async () => {
    const { data: history } = await admin
      .from("shopping_list_history")
      .delete()
      .eq("trip_id", tripId)
      .select("shopping_list_item_id");

    const itemIds = (history ?? []).map((row) => row.shopping_list_item_id);
    await admin.from("shopping_list_item").delete().in("id", itemIds);
    await admin.from("trip").delete().eq("id", tripId);
  });

  test("creates the item and returns its id", async () => {
    const result = await createItem(tripId, item);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const { data: created } = await admin
      .from("shopping_list_item")
      .select("id, name, category")
      .eq("id", result.data.id)
      .single();

    expect(created).toEqual({
      id: result.data.id,
      name: "Milk",
      category: Category.DAIRY,
    });
  });

  test("creates the first history entry for the trip", async () => {
    const result = await createItem(tripId, item);
    if (!result.success) throw new Error(result.error);

    const { data: history } = await admin
      .from("shopping_list_history")
      .select(
        "trip_id, shopping_list_item_id, unit, amount, bought_at, removed_at",
      )
      .eq("shopping_list_item_id", result.data.id);

    expect(history).toEqual([
      {
        trip_id: tripId,
        shopping_list_item_id: result.data.id,
        unit: Unit.LITER,
        amount: 2,
        bought_at: null,
        removed_at: null,
      },
    ]);
  });

  test("fails and writes nothing when the trip does not exist", async () => {
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
