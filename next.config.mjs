/**
 * VESTIGIAL — this file is never loaded. Do not add config here.
 *
 * Next.js reads the config from the directory it runs in, and every script in
 * the root package.json shells into `apps/web` first (`cd apps/web && next …`).
 * The config that actually takes effect is `apps/web/next.config.ts`.
 *
 * It is kept only so the historical intent below stays visible and so nobody
 * "restores" it later believing it was lost. Two notes on that intent:
 *
 *   - `experimental.turbopack` is not a real Next.js option in v16. Turbopack
 *     is the default bundler for `next dev` and `next build`, and nothing in
 *     this repo opts out of it, so the app builds with Turbopack today.
 *   - To genuinely switch back to Webpack, pass `--webpack` to the `next dev` /
 *     `next build` scripts in `apps/web/package.json`. Editing this file will
 *     have no effect whatsoever.
 *
 * If the repo ever grows a second app, delete this file rather than trying to
 * make it authoritative — per-app config belongs in each app directory.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  experimental: {
    turbopack: false, // Historical intent: switch to Webpack. Has no effect — see above.
  },
};

export default nextConfig;
