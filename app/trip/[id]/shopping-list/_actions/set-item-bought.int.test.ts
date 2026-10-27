import { silenceErrorLog } from "@/test/integration/console";
import {
  cleanUp,
  createTestTrip,
  createTestUser,
  TEST_PASSWORD,
  TestUser,
} from "@/test/integration/fixtures";
import { signInAs, signOut } from "@/test/integration/session";
import { addEntry, getEntry, seedItem } from "@/test/integration/shopping-list";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { setShoppingListItemBought } from "./set-item-bought";

const BOUGHT_AT = "2026-07-02T10:00:00+00:00";

describe("changeItemBoughtState", () => {
  let owner: TestUser;
  let users: TestUser[];
  let tripId: string;
  let tripIds: string[];
  let itemId: string;

  // A trip needs an owner profile, and a profile needs an auth user
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

  test("buys the open entry and records who changed it", async () => {
    const entryId = await addEntry(itemId, {
      created_at: "2026-07-01T10:00:00Z",
    });
    const before = await getEntry(entryId);

    const result = await setShoppingListItemBought(tripId, itemId, true);

    expect(result.success).toBe(true);
    const after = await getEntry(entryId);
    expect(after.bought_at).not.toBeNull();
    expect(after.removed_at).toBeNull();
    expect(after.updated_by).toBe(owner.profileId);
    expect(Date.parse(after.updated_at)).toBeGreaterThan(
      Date.parse(before.updated_at),
    );
  });

  test("keeps the first date when buying an entry that is already bought", async () => {
    const entryId = await addEntry(itemId, {
      created_at: "2026-07-01T10:00:00Z",
      bought_at: BOUGHT_AT,
    });

    const result = await setShoppingListItemBought(tripId, itemId, true);

    expect(result.success).toBe(true);
    expect(Date.parse((await getEntry(entryId)).bought_at!)).toBe(
      Date.parse(BOUGHT_AT),
    );
  });

  test("unbuys a bought entry", async () => {
    const entryId = await addEntry(itemId, {
      created_at: "2026-07-01T10:00:00Z",
      bought_at: BOUGHT_AT,
    });

    const result = await setShoppingListItemBought(tripId, itemId, false);

    expect(result.success).toBe(true);
    expect((await getEntry(entryId)).bought_at).toBeNull();
  });

  test("changes only the latest entry of the item", async () => {
    const olderId = await addEntry(itemId, {
      created_at: "2026-07-01T10:00:00Z",
      bought_at: BOUGHT_AT,
    });
    const latestId = await addEntry(itemId, {
      created_at: "2026-07-03T10:00:00Z",
      bought_at: "2026-07-04T10:00:00Z",
    });

    const result = await setShoppingListItemBought(tripId, itemId, false);

    expect(result.success).toBe(true);
    expect((await getEntry(latestId)).bought_at).toBeNull();
    expect(Date.parse((await getEntry(olderId)).bought_at!)).toBe(
      Date.parse(BOUGHT_AT),
    );
  });

  test("fails when the latest entry was removed", async () => {
    silenceErrorLog();
    const olderId = await addEntry(itemId, {
      created_at: "2026-07-01T10:00:00Z",
      bought_at: BOUGHT_AT,
    });
    const removedId = await addEntry(itemId, {
      created_at: "2026-07-03T10:00:00Z",
      removed_at: "2026-07-04T10:00:00Z",
    });

    const result = await setShoppingListItemBought(tripId, itemId, false);

    expect(result.success).toBe(false);
    expect((await getEntry(removedId)).bought_at).toBeNull();
    expect((await getEntry(olderId)).bought_at).not.toBeNull();
  });

  test("fails when the item has no entries", async () => {
    silenceErrorLog();

    const result = await setShoppingListItemBought(tripId, itemId, true);

    expect(result.success).toBe(false);
  });

  test("fails when the item does not exist", async () => {
    silenceErrorLog();

    const result = await setShoppingListItemBought(tripId, randomUUID(), true);

    expect(result.success).toBe(false);
  });

  test("fails and changes nothing when the item belongs to another trip", async () => {
    silenceErrorLog();
    const entryId = await addEntry(itemId, {
      created_at: "2026-07-01T10:00:00Z",
    });
    const otherTripId = await createTestTrip(owner);
    tripIds.push(otherTripId);

    const result = await setShoppingListItemBought(otherTripId, itemId, true);

    expect(result.success).toBe(false);
    expect((await getEntry(entryId)).bought_at).toBeNull();
  });

  test("lets a guest of the trip buy an item", async () => {
    const guest = await createTestUser("Guest");
    users.push(guest);
    const guestTripId = await createTestTrip(owner, [guest]);
    tripIds.push(guestTripId);
    const guestItemId = await seedItem(guestTripId);
    const entryId = await addEntry(guestItemId, {
      created_at: "2026-07-01T10:00:00Z",
    });
    await signInAs(guest.email, TEST_PASSWORD);

    const result = await setShoppingListItemBought(
      guestTripId,
      guestItemId,
      true,
    );

    expect(result.success).toBe(true);
    const entry = await getEntry(entryId);
    expect(entry.bought_at).not.toBeNull();
    expect(entry.updated_by).toBe(guest.profileId);
  });

  test("fails and changes nothing for a user outside the trip", async () => {
    silenceErrorLog();
    const entryId = await addEntry(itemId, {
      created_at: "2026-07-01T10:00:00Z",
    });
    const stranger = await createTestUser("Stranger");
    users.push(stranger);
    await signInAs(stranger.email, TEST_PASSWORD);

    const result = await setShoppingListItemBought(tripId, itemId, true);

    expect(result.success).toBe(false);
    expect((await getEntry(entryId)).bought_at).toBeNull();
  });

  test("fails and changes nothing for anonymous callers", async () => {
    silenceErrorLog();
    const entryId = await addEntry(itemId, {
      created_at: "2026-07-01T10:00:00Z",
    });
    signOut();

    const result = await setShoppingListItemBought(tripId, itemId, true);

    expect(result.success).toBe(false);
    expect((await getEntry(entryId)).bought_at).toBeNull();
  });
});
