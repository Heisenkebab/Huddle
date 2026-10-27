import {
  cleanUp,
  createTestTrip,
  createTestUser,
  TEST_PASSWORD,
  TestUser,
} from "@/test/integration/fixtures";
import { silenceErrorLog } from "@/test/integration/console";
import { signInAs, signOut } from "@/test/integration/session";
import { addEntry, getEntry, seedItem } from "@/test/integration/shopping-list";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import restoreRemovedShoppingListItem from "./restore-removed-item";

const REMOVED_AT = "2026-07-04T10:00:00+00:00";

describe("restoreShoppingListItem", () => {
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

  test("restores the removed entry and records who changed it", async () => {
    const entryId = await addEntry(itemId, {
      created_at: "2026-07-01T10:00:00Z",
      removed_at: REMOVED_AT,
    });
    const before = await getEntry(entryId);

    const result = await restoreRemovedShoppingListItem(tripId, itemId);

    expect(result.success).toBe(true);
    const after = await getEntry(entryId);
    expect(after.removed_at).toBeNull();
    expect(after.bought_at).toBeNull();
    expect(after.updated_by).toBe(owner.profileId);
    expect(Date.parse(after.updated_at)).toBeGreaterThan(
      Date.parse(before.updated_at),
    );
  });

  test("restores only the latest entry of the item", async () => {
    const olderId = await addEntry(itemId, {
      created_at: "2026-07-01T10:00:00Z",
      removed_at: "2026-07-02T10:00:00Z",
    });
    const latestId = await addEntry(itemId, {
      created_at: "2026-07-03T10:00:00Z",
      removed_at: REMOVED_AT,
    });

    const result = await restoreRemovedShoppingListItem(tripId, itemId);

    expect(result.success).toBe(true);
    expect((await getEntry(latestId)).removed_at).toBeNull();
    expect((await getEntry(olderId)).removed_at).not.toBeNull();
  });

  test("fails and changes nothing when the latest entry was not removed", async () => {
    silenceErrorLog();
    const removedId = await addEntry(itemId, {
      created_at: "2026-07-01T10:00:00Z",
      removed_at: "2026-07-02T10:00:00Z",
    });
    const openId = await addEntry(itemId, {
      created_at: "2026-07-03T10:00:00Z",
    });

    const result = await restoreRemovedShoppingListItem(tripId, itemId);

    expect(result.success).toBe(false);
    expect((await getEntry(removedId)).removed_at).not.toBeNull();
    expect((await getEntry(openId)).removed_at).toBeNull();
  });

  test("fails when the item has no entries", async () => {
    silenceErrorLog();

    const result = await restoreRemovedShoppingListItem(tripId, itemId);

    expect(result.success).toBe(false);
  });

  test("fails when the item does not exist", async () => {
    silenceErrorLog();

    const result = await restoreRemovedShoppingListItem(tripId, randomUUID());

    expect(result.success).toBe(false);
  });

  test("fails and changes nothing when the item belongs to another trip", async () => {
    silenceErrorLog();
    const entryId = await addEntry(itemId, {
      created_at: "2026-07-01T10:00:00Z",
      removed_at: REMOVED_AT,
    });
    const otherTripId = await createTestTrip(owner);
    tripIds.push(otherTripId);

    const result = await restoreRemovedShoppingListItem(otherTripId, itemId);

    expect(result.success).toBe(false);
    expect((await getEntry(entryId)).removed_at).not.toBeNull();
  });

  test("lets a guest of the trip restore an item", async () => {
    const guest = await createTestUser("Guest");
    users.push(guest);
    const guestTripId = await createTestTrip(owner, [guest]);
    tripIds.push(guestTripId);
    const guestItemId = await seedItem(guestTripId);
    const entryId = await addEntry(guestItemId, {
      created_at: "2026-07-01T10:00:00Z",
      removed_at: REMOVED_AT,
    });
    await signInAs(guest.email, TEST_PASSWORD);

    const result = await restoreRemovedShoppingListItem(
      guestTripId,
      guestItemId,
    );

    expect(result.success).toBe(true);
    const entry = await getEntry(entryId);
    expect(entry.removed_at).toBeNull();
    expect(entry.updated_by).toBe(guest.profileId);
  });

  test("fails and changes nothing for a user outside the trip", async () => {
    silenceErrorLog();
    const entryId = await addEntry(itemId, {
      created_at: "2026-07-01T10:00:00Z",
      removed_at: REMOVED_AT,
    });
    const stranger = await createTestUser("Stranger");
    users.push(stranger);
    await signInAs(stranger.email, TEST_PASSWORD);

    const result = await restoreRemovedShoppingListItem(tripId, itemId);

    expect(result.success).toBe(false);
    expect((await getEntry(entryId)).removed_at).not.toBeNull();
  });

  test("fails and changes nothing for anonymous callers", async () => {
    silenceErrorLog();
    const entryId = await addEntry(itemId, {
      created_at: "2026-07-01T10:00:00Z",
      removed_at: REMOVED_AT,
    });
    signOut();

    const result = await restoreRemovedShoppingListItem(tripId, itemId);

    expect(result.success).toBe(false);
    expect((await getEntry(entryId)).removed_at).not.toBeNull();
  });
});
