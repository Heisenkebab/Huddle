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
