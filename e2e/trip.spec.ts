import { expect, test } from "@playwright/test";

import { cleanUpTrip, SeededTrip, seedTripWithInvite } from "./support/admin";

test.describe("trip page", () => {
  let seed: SeededTrip | undefined;

  test.afterEach(async () => {
    if (seed) await cleanUpTrip(seed);
    seed = undefined;
  });

  // KAN-103 AC 6: the invite link is the only way in
  test("a non-member can't open the trip page directly", async ({ page }) => {
    seed = await seedTripWithInvite();
    await page.goto(`/trip/${seed.tripId}`);

    await expect(page).toHaveURL("/");
  });
});
