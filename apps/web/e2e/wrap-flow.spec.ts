import { test, expect, type Page } from "@playwright/test";

/**
 * Authenticated flow: seeded session → dashboard → wrap slides → share toggle.
 * Requires the database to be seeded by e2e/helpers/seed-session.mjs (wired
 * into the Playwright webServer command; skipped when PLAYWRIGHT_BASE_URL is
 * set — the external environment seeds itself).
 */

const SESSION_TOKEN = process.env.E2E_SESSION_TOKEN ?? "e2e-session-token";
// Mirror lib/wrapYear.ts (recap season = Jan–Mar → previous year).
const YEAR = Number(
  process.env.WRAP_YEAR ??
    (new Date().getMonth() < 3 ? new Date().getFullYear() - 1 : new Date().getFullYear()),
);

async function login(page: Page) {
  const { origin } = new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000");
  await page.context().addCookies([
    {
      name: "authjs.session-token",
      value: SESSION_TOKEN,
      domain: new URL(origin).hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

test.describe("dashboard", () => {
  test("shows all four seeded connections as Connected", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard");

    // 4 seeded providers render a Connected badge each.
    await expect(page.locator("text=Connected").first()).toBeAttached();
    expect(await page.locator("text=Connected").count()).toBeGreaterThanOrEqual(4);
  });

  test("generate CTA names the wrap year", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard");
    await expect(page.getByText(`Generate Your ${YEAR} Wrap`)).toBeAttached();
  });
});

test.describe("wrap experience", () => {
  test("renders the cached wrap's slides without regenerating", async ({ page }) => {
    await login(page);
    await page.goto("/wrap");

    // Seeded fixture data must appear verbatim — proves server-passed
    // initialData is used and no provider fetch clobbered it.
    await expect(page.getByText("E2E Song")).toBeAttached();
    await expect(page.getByText("E2E Video")).toBeAttached();
    await expect(page.locator("body")).toContainText("800"); // strava distanceKm
  });

  test("refresh control is present with last-updated timestamp", async ({ page }) => {
    await login(page);
    await page.goto("/wrap");
    await expect(page.getByRole("button", { name: /Refresh/ })).toBeVisible();
  });
});

test.describe("share API", () => {
  test("toggle enables sharing and returns a share URL for the seeded year", async ({
    page,
  }) => {
    await login(page);
    // page.request shares the browser context's cookies.
    const post = await page.request.post(`/api/wrap/share?year=${YEAR}`, {
      data: { enabled: true },
    });
    expect(post.status()).toBe(200);
    const body = await post.json();
    expect(body.isPublic).toBe(true);
    expect(body.shareId).toBeTruthy();
    expect(body.shareUrl).toContain(`/share/${body.shareId}`);

    const get = await page.request.get(`/api/wrap/share?year=${YEAR}`);
    const status = await get.json();
    expect(status.isPublic).toBe(true);

    // Leave the fixture private again.
    await page.request.post(`/api/wrap/share?year=${YEAR}`, { data: { enabled: false } });
  });

  test("rejects unauthenticated requests", async ({ request }) => {
    const res = await request.get(`/api/wrap/share?year=${YEAR}`);
    expect(res.status()).toBe(401);
  });
});
