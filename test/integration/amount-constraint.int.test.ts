import { createAdminClient } from "@/test/integration/admin-client";
import {
  cleanUp,
  createTestTrip,
  createTestUser,
  TestUser,
} from "@/test/integration/fixtures";
import { Unit } from "@/types/shopping-list";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

// Writes straight to the table with the admin client, so only the
// constraint is checked and not the RPCs in front of it
const admin = createAdminClient();

describe("shopping_list_history_amount_check", () => {
  let owner: TestUser;
  let tripId: string;
  let itemId: string;

  beforeEach(async () => {
    owner = await createTestUser();
    tripId = await createTestTrip(owner);

    const { data, error } = await admin
      .from("shopping_list_item")
      .insert({ trip_id: tripId, name: "Milk", category: "CHILLED" })
      .select("id")
      .single();
    if (error) throw error;
    itemId = data.id;
  });

  afterEach(async () => {
    await cleanUp([tripId], [owner]);
  });

  async function insertEntry(unit: Unit, amount: number) {
    return admin
      .from("shopping_list_history")
      .insert({ shopping_list_item_id: itemId, unit, amount });
  }

  test.each([
    { unit: Unit.GRAM, amount: 200 },
    { unit: Unit.MILLILITER, amount: 250 },
    { unit: Unit.AMOUNT, amount: 3 },
    { unit: Unit.KILOGRAM, amount: 1.234 },
    { unit: Unit.LITER, amount: 0.5 },
    { unit: Unit.GRAM, amount: 10000 },
  ])("accepts $amount $unit", async ({ unit, amount }) => {
    const { error } = await insertEntry(unit, amount);

    expect(error).toBeNull();
  });

  test.each([
    { unit: Unit.GRAM, amount: 200.2 },
    { unit: Unit.MILLILITER, amount: 0.5 },
    { unit: Unit.AMOUNT, amount: 2.5 },
    { unit: Unit.KILOGRAM, amount: 1.2345 },
    { unit: Unit.LITER, amount: 0 },
    { unit: Unit.GRAM, amount: -100 },
    { unit: Unit.AMOUNT, amount: 10001 },
  ])("rejects $amount $unit", async ({ unit, amount }) => {
    const { error } = await insertEntry(unit, amount);

    // 23514 = check_violation
    expect(error?.code).toBe("23514");
  });

  test("rejects an update that makes the amount invalid", async () => {
    const inserted = await insertEntry(Unit.LITER, 2.5);
    if (inserted.error) throw inserted.error;

    const { error } = await admin
      .from("shopping_list_history")
      .update({ unit: Unit.GRAM })
      .eq("shopping_list_item_id", itemId);

    expect(error?.code).toBe("23514");
  });
});

describe("shopping_list_item_name_length", () => {
  let owner: TestUser;
  let tripId: string;

  beforeEach(async () => {
    owner = await createTestUser();
    tripId = await createTestTrip(owner);
  });

  afterEach(async () => {
    await cleanUp([tripId], [owner]);
  });

  async function insertItem(name: string) {
    return admin
      .from("shopping_list_item")
      .insert({ trip_id: tripId, name, category: "OTHER" });
  }

  test("accepts a name with 80 characters", async () => {
    const { error } = await insertItem("a".repeat(80));

    expect(error).toBeNull();
  });

  test.each([
    { label: "81 characters", name: "a".repeat(81) },
    { label: "only spaces", name: "   " },
  ])("rejects a name with $label", async ({ name }) => {
    const { error } = await insertItem(name);

    expect(error?.code).toBe("23514");
  });
});
