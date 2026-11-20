import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

import en from "@/messages/en.json";

import {
  addGuest,
  anonymousUserIdsForInvite,
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
const credentialFields = (page: Page) => page.getByLabel(/e-?mail|password/i);
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

  test("shows a 404 when the invite id does not exist", async ({ page }) => {
    expect((await page.goto(`/invite/${randomUUID()}`))?.status()).toBe(404);

    //not-found.tsx
    await expect(page.getByText(/invalid or has expired/i)).toBeVisible();
    await expect(page.getByText(TEST_TRIP.name, { exact: true })).toHaveCount(
      0,
    );
  });

  test("shows a 404 when the invite is expired", async ({ page }) => {
    seed = await seedTripWithInvite({ endingAt: daysFromNow(-1) });
    expect((await page.goto(`/invite/${seed.inviteId}`))?.status()).toBe(404);

    //not-found.tsx
    await expect(page.getByText(/invalid or has expired/i)).toBeVisible();
    await expect(page.getByText(TEST_TRIP.name, { exact: true })).toHaveCount(
      0,
    );
  });

  test("shows a 404 when the invite is expired, even for a guest of the trip", async ({
    page,
    context,
    baseURL,
  }) => {
    seed = await seedTripWithInvite({ endingAt: daysFromNow(-1) });
    const member = await createUserWithProfile("Max");
    await addGuest(seed.tripId, member.profileId);
    await signInAs(context, member, baseURL!);

    expect((await page.goto(`/invite/${seed.inviteId}`))?.status()).toBe(404);

    await expect(page.getByText(/invalid or has expired/i)).toBeVisible();
    await expect(page.getByText(TEST_TRIP.name, { exact: true })).toHaveCount(
      0,
    );
  });

  test("shows the page for a valid invite id", async ({ page }) => {
    seed = await seedTripWithInvite();
    await page.goto(`/invite/${seed.inviteId}`);

    await expect(page.getByText(TEST_TRIP.name, { exact: true })).toBeVisible();
    await expect(page.getByText(OWNER_NAME, { exact: true })).toBeVisible();
    await expect(joinButton(page)).toBeEnabled();

    //expect no email or password field
    await expect(credentialFields(page)).toHaveCount(0);
  });

  test("clicking join shows the name and color form, joining opens the trip", async ({
    page,
  }) => {
    seed = await seedTripWithInvite();
    await openJoinForm(page, seed.inviteId);

    await expect(colorPicker(page)).toBeVisible();

    //the form asks for a name only, never email or password
    await expect(credentialFields(page)).toHaveCount(0);

    await nameField(page).fill("Lena");
    await joinButton(page).click();

    await expect(page).toHaveURL(tripUrl(seed.tripId));
    await expect(
      page.getByText(TEST_TRIP.name, { exact: true }).first(),
    ).toBeVisible();

    const guests = await guestUserIds(seed.tripId);
    expect(await anonymousUserIdsForInvite(seed.inviteId)).toEqual(guests);
    expect(guests).toHaveLength(1);
    expect(await profileOf(guests[0])).toMatchObject({ name: "Lena" });
  });

  test("joining saves the picked color on the new profile", async ({
    page,
  }) => {
    seed = await seedTripWithInvite();
    await openJoinForm(page, seed.inviteId);

    await nameField(page).fill("Lena");

    const picked = colorPicker(page).getByRole("radio").nth(2);
    await expect(picked).not.toBeChecked();
    await picked.check();
    const pickedColor = await picked.getAttribute("value");

    await joinButton(page).click();
    await expect(page).toHaveURL(tripUrl(seed.tripId));

    const guests = await guestUserIds(seed.tripId);

    expect(pickedColor).toBeTruthy();
    expect(await profileOf(guests[0])).toMatchObject({
      color: pickedColor,
    });
  });

  test("clicking join twice creates only one guest and one anonymous user", async ({
    page,
  }) => {
    seed = await seedTripWithInvite();
    await openJoinForm(page, seed.inviteId);

    await nameField(page).fill("Lena");
    await joinButton(page).dblclick();
    await expect(page).toHaveURL(tripUrl(seed.tripId));

    expect(await guestUserIds(seed.tripId)).toHaveLength(1);
    expect(await anonymousUserIdsForInvite(seed.inviteId)).toHaveLength(1);
  });

  test("disables join when the name is empty or only spaces", async ({
    page,
  }) => {
    seed = await seedTripWithInvite();
    await openJoinForm(page, seed.inviteId);

    await expect(joinButton(page)).toBeDisabled();

    await nameField(page).fill("   ");
    await expect(joinButton(page)).toBeDisabled();

    await nameField(page).fill("");
    await expect(joinButton(page)).toBeDisabled();

    await nameField(page).fill("Lena");
    await expect(joinButton(page)).toBeEnabled();
  });

  test("disables join when the trimmed name is longer than 50 characters", async ({
    page,
  }) => {
    seed = await seedTripWithInvite();
    await openJoinForm(page, seed.inviteId);

    await expect(joinButton(page)).toBeDisabled();

    await nameField(page).fill("Lena");
    await expect(joinButton(page)).toBeEnabled();

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
    await expect(page.getByText(/joining as max/i)).toBeVisible();
    await joinButton(page).click();

    await expect(page).toHaveURL(tripUrl(seed.tripId));
    expect(await guestUserIds(seed.tripId)).toEqual([user.userId]);
    expect(await profileOf(user.userId)).toMatchObject({
      name: "Max",
      color: "#3B82F6",
    });
  });

  test("a signed-in user without a profile joins through the name form without a new account", async ({
    page,
    context,
    baseURL,
  }) => {
    seed = await seedTripWithInvite();
    const user = await createUser();
    extraUserIds.push(user.userId);
    await signInAs(context, user, baseURL!);

    await openJoinForm(page, seed.inviteId);

    await nameField(page).fill("Max");
    await joinButton(page).click();

    await expect(page).toHaveURL(tripUrl(seed.tripId));

    expect(await anonymousUserIdsForInvite(seed.inviteId)).toEqual([]);
    expect(await guestUserIds(seed.tripId)).toEqual([user.userId]);
    expect(await profileOf(user.userId)).toMatchObject({ name: "Max" });
  });

  test("after joining, the trip opens directly without the invite link", async ({
    page,
    context,
  }) => {
    seed = await seedTripWithInvite();
    await joinAs(page, seed, "Lena");

    // Like reopening the app on the same device (same cookies)
    await page.close();
    const reopened = await context.newPage();
    await reopened.goto(`/trip/${seed.tripId}`);

    await expect(reopened).toHaveURL(tripUrl(seed.tripId));
    await expect(
      reopened.getByText(TEST_TRIP.name, { exact: true }).first(),
    ).toBeVisible();
    await expect(nameField(reopened)).toHaveCount(0);
  });

  test("after joining, the sidebar lists the guest as you", async ({
    page,
    isMobile,
  }) => {
    // The travellers list is in the Sidebar, which only shows from lg up
    test.skip(isMobile, "travellers list is desktop-only");

    seed = await seedTripWithInvite();
    await joinAs(page, seed, "Lena");
    await page.goto(`/trip/${seed.tripId}/shopping-list`);

    const avatar = page.getByRole("listitem").filter({ hasText: "Lena" });
    await expect(avatar).toBeVisible();
    await expect(avatar).toContainText(`(${en.trip.you})`);
  });
});
