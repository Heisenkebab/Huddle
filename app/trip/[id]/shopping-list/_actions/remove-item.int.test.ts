import { createAdminClient } from "@/test/integration/admin-client";
import { silenceErrorLog } from "@/test/integration/console";
import {
  cleanUp,
  createTestTrip,
  createTestUser,
  TEST_PASSWORD,
  TestUser,
} from "@/test/integration/fixtures";
import { signInAs, signOut } from "@/test/integration/session";
import { Category, Unit } from "@/types/shopping-list";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import removeShoppingListItem from "./remove-item";

const admin = createAdminClient();

const BOUGHT_AT = "2026-07-02T10:00:00+00:00";
const REMOVED_AT = "2026-07-02T10:00:00+00:00";

async function seedItem(tripId: string) {
  const id = randomUUID();
  const { error } = await admin
    .from("shopping_list_item")
    .insert({ id, trip_id: tripId, name: "Milk", category: Category.CHILLED });
  if (error) throw error;
  return id;
}

async function addEntry(
  itemId: string,
  state: { bought_at?: string; removed_at?: string } = {},
) {
  const { data, error } = await admin
    .from("shopping_list_history")
    .insert({
      shopping_list_item_id: itemId,
      unit: Unit.LITER,
      amount: 1,
      ...state,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function getEntry(entryId: string) {
  const { data, error } = await admin
    .from("shopping_list_history")
    .select("bought_at, removed_at")
    .eq("id", entryId)
    .single();
  if (error) throw error;
  return data;
}

describe("removeShoppingListItem", () => {
  let owner: TestUser;
  let users: TestUser[];
  let tripId: string;
  let tripIds: string[];
  let itemId: string;

  beforeEach(async () => {
    owner = await createTestUser();
    users = [owner];
    tripId = await createTestTrip(owner);
    tripIds = [tripId];
    await signInAs(owner.email, TEST_PASSWORD);

    itemId = await seedItem(tripId);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    signOut();
    await cleanUp(tripIds, users);
  });

  test("removes the open entry of the item", async () => {
    const entryId = await addEntry(itemId);

    const result = await removeShoppingListItem(tripId, itemId);

    expect(result.success).toBe(true);
    const entry = await getEntry(entryId);
    expect(entry.removed_at).not.toBeNull();
    expect(entry.bought_at).toBeNull();
  });

  test("fails and changes nothing when itemId is null", async () => {
    silenceErrorLog();
    const entryId = await addEntry(itemId);

    const result = await removeShoppingListItem(
      tripId,
      null as unknown as string,
    );

    expect(result.success).toBe(false);
    expect((await getEntry(entryId)).removed_at).toBeNull();
  });

  test("fails and changes nothing when tripId is null", async () => {
    silenceErrorLog();
    const entryId = await addEntry(itemId);

    const result = await removeShoppingListItem(
      null as unknown as string,
      itemId,
    );

    expect(result.success).toBe(false);
    expect((await getEntry(entryId)).removed_at).toBeNull();
  });

  test("fails and keeps the date when the entry is already removed", async () => {
    silenceErrorLog();
    const entryId = await addEntry(itemId, { removed_at: REMOVED_AT });

    const result = await removeShoppingListItem(tripId, itemId);

    expect(result.success).toBe(false);
    expect(Date.parse((await getEntry(entryId)).removed_at!)).toBe(
      Date.parse(REMOVED_AT),
    );
  });

  test("fails and changes nothing when the entry is already bought", async () => {
    silenceErrorLog();
    const entryId = await addEntry(itemId, { bought_at: BOUGHT_AT });

    const result = await removeShoppingListItem(tripId, itemId);

    expect(result.success).toBe(false);
    const entry = await getEntry(entryId);
    expect(entry.removed_at).toBeNull();
    expect(Date.parse(entry.bought_at!)).toBe(Date.parse(BOUGHT_AT));
  });

  test("fails and changes nothing for a user outside the trip", async () => {
    silenceErrorLog();
    const entryId = await addEntry(itemId);
    const stranger = await createTestUser("Stranger");
    users.push(stranger);
    await signInAs(stranger.email, TEST_PASSWORD);

    const result = await removeShoppingListItem(tripId, itemId);

    expect(result.success).toBe(false);
    expect((await getEntry(entryId)).removed_at).toBeNull();
  });

  test("fails and changes nothing when the item belongs to another trip", async () => {
    silenceErrorLog();
    const entryId = await addEntry(itemId);
    const otherTripId = await createTestTrip(owner);
    tripIds.push(otherTripId);

    const result = await removeShoppingListItem(otherTripId, itemId);

    expect(result.success).toBe(false);
    expect((await getEntry(entryId)).removed_at).toBeNull();
  });
});
