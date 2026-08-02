import { test, expect } from "@playwright/test";

/**
 * Minimal smoke: landing page responds.
 * Requires a built app + valid env (or PLAYWRIGHT_BASE_URL pointing at a running server).
 */
test.describe("landing", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/OmniWrap|Create Next App|Next/i);
    // Prefer brand content when present; fall back to body visibility.
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });
});
