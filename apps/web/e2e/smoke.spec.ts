import { test, expect } from "@playwright/test";

/**
 * Public-page smoke + unauthenticated protection.
 * Requires a built app + valid env (or PLAYWRIGHT_BASE_URL pointing at a
 * running server). The authenticated flows live in wrap-flow.spec.ts.
 */
test.describe("landing", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/OmniWrap|Create Next App|Next/i);
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("sign-in page", () => {
  test("renders OAuth connect options", async ({ page }) => {
    await page.goto("/signin");
    // At least one provider connect CTA should be present.
    const connectButtons = page.locator('button:has-text("Connect"), a:has-text("Continue")');
    await expect(connectButtons.first()).toBeVisible();
  });
});

test.describe("unauthenticated protection", () => {
  test("/dashboard redirects to /signin", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/signin");
  });

  test("/wrap redirects to /signin", async ({ page }) => {
    await page.goto("/wrap");
    await page.waitForURL("**/signin");
  });
});