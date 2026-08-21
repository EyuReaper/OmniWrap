import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests live in `e2e/`. Run with `npm run test:e2e`.
 * Set PLAYWRIGHT_BASE_URL to hit an already-running server (skips webServer
 * AND seeding — the external environment must seed itself).
 *
 * When we own the server, seed the database first (user/session/connections/
 * fixture wrap — see e2e/helpers/seed-session.mjs) so the authenticated
 * flow specs can sign in via the seeded `authjs.session-token` cookie.
 * Requires the schema to exist (`npx prisma db push`) and DATABASE_URL to be
 * reachable.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Only start Next when no external base URL is provided.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "node e2e/helpers/seed-session.mjs && npm run start",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
