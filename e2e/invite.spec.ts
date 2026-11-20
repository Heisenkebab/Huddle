import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

import en from "@/messages/en.json";

import {
  addGuest,
  cleanUpTrip,
  createUser,
  createUserWithProfile,
  daysFromNow,
  deleteUsers,
  guestUserIds,
  OWNER_NAME,
  profileOf,
  SeededTrip,
  seedTripWithInvite,
  TEST_TRIP,
} from "./support/admin";
import { signInAs } from "./support/auth";

// The app picks the language from Accept-Language, so pin it to match en.json
test.use({ locale: "en-US" });

/*
 * The page has two screens: first the trip with a "Join" button, then (for
 * visitors without a profile) the name and color form with its own "Join"
 * button. The form replaces the first screen, so there is only ever one
 * "Join" button; Playwright's strict locators fail the test if there are two.
 */
const joinButton = (page: Page) => page.getByRole("button", { name: /join/i });
const nameField = (page: Page) => page.getByLabel(/name/i);
const colorPicker = (page: Page) =>
  page.getByRole("radiogroup", { name: /color/i });
const tripUrl = (tripId: string) => new RegExp(`/trip/${tripId}`);

// From the first screen to the name and color form
async function openJoinForm(page: Page, inviteId: string) {
  await page.goto(`/invite/${inviteId}`);
  await joinButton(page).click();
  await expect(nameField(page)).toBeVisible();
}

// Signed out: through both screens until the trip opens
async function joinAs(page: Page, seed: SeededTrip, name: string) {
  await openJoinForm(page, seed.inviteId);
  await nameField(page).fill(name);
  await joinButton(page).click();
  await expect(page).toHaveURL(tripUrl(seed.tripId));
}

// KAN-103: join a trip through the invite link with just a name
test.describe("invite page", () => {
  let seed: SeededTrip | undefined;
  // Users a test created besides the trip owner and its guests
  const extraUserIds: string[] = [];

  test.afterEach(async () => {
    if (seed) await cleanUpTrip(seed);
    seed = undefined;
    await deleteUsers(extraUserIds.splice(0));
  });

  test("redirects to the home page when the invite id does not exist", async ({
    page,
  }) => {
    await page.goto(`/invite/${randomUUID()}`);

    await expect(page).toHaveURL("/");
  });

  test("redirects to the home page when the invite is expired", async ({
    page,
  }) => {
    seed = await seedTripWithInvite({ endingAt: daysFromNow(-1) });
    await page.goto(`/invite/${seed.inviteId}`);

    await expect(page).toHaveURL("/");
    await expect(page.getByText(TEST_TRIP.name)).toHaveCount(0);
  });

  test("shows the page for a valid invite id", async ({ page }) => {
    seed = await seedTripWithInvite();
    await page.goto(`/invite/${seed.inviteId}`);

    // AC 1: trip name and fellow travellers with the join button
    await expect(page.getByText(TEST_TRIP.name)).toBeVisible();
    await expect(page.getByText(OWNER_NAME)).toBeVisible();
    await expect(joinButton(page)).toBeEnabled();

    // AC 3: never asks for email or password
    await expect(page.getByLabel(/e-?mail|password/i)).toHaveCount(0);
  });

  test("clicking join shows the name and color form, joining opens the trip", async ({
    page,
  }) => {
    seed = await seedTripWithInvite();

    await openJoinForm(page, seed.inviteId);
    await expect(colorPicker(page)).toBeVisible();
    // AC 3: the form asks for a name only, never email or password
    await expect(page.getByLabel(/e-?mail|password/i)).toHaveCount(0);

    await nameField(page).fill("Lena");
    await joinButton(page).click();

    await expect(page).toHaveURL(tripUrl(seed.tripId));
    await expect(page.getByText(TEST_TRIP.name)).toBeVisible();
  });

  test("disables join when the name is empty or only spaces", async ({
    page,
  }) => {
    seed = await seedTripWithInvite();
    await openJoinForm(page, seed.inviteId);

    // AC 2
    await expect(joinButton(page)).toBeDisabled();

    await nameField(page).fill("   ");
    await expect(joinButton(page)).toBeDisabled();

    await nameField(page).fill("Lena");
    await expect(joinButton(page)).toBeEnabled();

    await nameField(page).fill("");
    await expect(joinButton(page)).toBeDisabled();
  });

  test("disables join when the trimmed name is longer than 50 characters", async ({
    page,
  }) => {
    seed = await seedTripWithInvite();
    await openJoinForm(page, seed.inviteId);

    // Exactly 50 after trimming is allowed, surrounding spaces don't count
    await nameField(page).fill(`  ${"a".repeat(50)}  `);
    await expect(joinButton(page)).toBeEnabled();

    await nameField(page).fill("a".repeat(51));
    await expect(joinButton(page)).toBeDisabled();
  });

  test("redirects to the trip right away when already a guest of it", async ({
    page,
    context,
    baseURL,
  }) => {
    seed = await seedTripWithInvite();
    const member = await createUserWithProfile("Max");
    await addGuest(seed.tripId, member.profileId);
    await signInAs(context, member, baseURL!);

    await page.goto(`/invite/${seed.inviteId}`);

    // AC 8: no join screen, straight into the trip
    await expect(page).toHaveURL(tripUrl(seed.tripId));
  });

  test("redirects the owner to the trip right away", async ({
    page,
    context,
    baseURL,
  }) => {
    seed = await seedTripWithInvite();
    // The owner is a member through trip.owner_id, not through guest_trip
    await signInAs(
      context,
      { userId: seed.ownerUserId, email: seed.ownerEmail },
      baseURL!,
    );

    await page.goto(`/invite/${seed.inviteId}`);

    await expect(page).toHaveURL(tripUrl(seed.tripId));
    expect(await guestUserIds(seed.tripId)).toEqual([]);
  });

  test("join on the first screen joins right away with the current account and profile", async ({
    page,
    context,
    baseURL,
  }) => {
    seed = await seedTripWithInvite();
    const user = await createUserWithProfile("Max", "#3B82F6");
    extraUserIds.push(user.userId);
    await signInAs(context, user, baseURL!);

    await page.goto(`/invite/${seed.inviteId}`);
    await joinButton(page).click();

    // No name form: the existing profile is used as is
    await expect(page).toHaveURL(tripUrl(seed.tripId));
    expect(await guestUserIds(seed.tripId)).toEqual([user.userId]);
    expect(await profileOf(user.userId)).toEqual({
      id: user.profileId,
      name: "Max",
      color: "#3B82F6",
    });
  });

  test("join on the first screen doesn't create a new account for a signed-in user without a profile", async ({
    page,
    context,
    baseURL,
  }) => {
    seed = await seedTripWithInvite();
    const user = await createUser();
    extraUserIds.push(user.userId);
    await signInAs(context, user, baseURL!);

    // Without a profile there is no name yet, so the form still appears
    await openJoinForm(page, seed.inviteId);
    await nameField(page).fill("Lena");
    await joinButton(page).click();

    await expect(page).toHaveURL(tripUrl(seed.tripId));
    // The signed-in account joined, not a new anonymous one
    expect(await guestUserIds(seed.tripId)).toEqual([user.userId]);
    expect(await profileOf(user.userId)).toMatchObject({ name: "Lena" });
  });

  test("after joining, the trip opens directly without the invite link", async ({
    page,
    context,
  }) => {
    seed = await seedTripWithInvite();
    await joinAs(page, seed, "Lena");

    // AC 5: like reopening the app on the same device (same cookies)
    await page.close();
    const reopened = await context.newPage();
    await reopened.goto(`/trip/${seed.tripId}`);

    await expect(reopened).toHaveURL(tripUrl(seed.tripId));
    await expect(reopened.getByText(TEST_TRIP.name)).toBeVisible();
    await expect(nameField(reopened)).toHaveCount(0);
  });

  test("items added after joining show the guest's name and avatar", async ({
    page,
  }) => {
    seed = await seedTripWithInvite();
    // Story demo: join as "Lena", then add an item to the shopping list
    await joinAs(page, seed, "Lena");
    await page.goto(`/trip/${seed.tripId}/shopping-list`);

    await page
      .getByRole("button", { name: en.shoppingList.addItem, exact: true })
      .click();
    const editor = page.getByRole("dialog");
    await editor
      .getByLabel(en.itemEditor.name, { exact: true })
      .fill("Sonnencreme");
    await editor
      .getByRole("button", { name: en.itemEditor.add, exact: true })
      .click();
    await expect(editor).toBeHidden();

    // AC 4: the avatar (PersonAvatar) shows Lena's initial and name
    const avatar = page.getByTitle(
      en.shoppingList.addedBy.replace("{name}", "Lena"),
    );
    await expect(page.getByText("Sonnencreme")).toBeVisible();
    await expect(avatar).toBeVisible();
    await expect(avatar).toHaveText("L");
  });

  test("a non-member can't open the trip page directly", async ({ page }) => {
    seed = await seedTripWithInvite();

    // AC 6: getTripAccess sends visitors without access to the home page
    await page.goto(`/trip/${seed.tripId}`);
    await expect(page).toHaveURL("/");
    await expect(page.getByText(TEST_TRIP.name)).toHaveCount(0);
  });
});
