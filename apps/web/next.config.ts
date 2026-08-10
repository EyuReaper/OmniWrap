import path from "node:path";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Service icons and OAuth avatars are fetched from a wide, provider-controlled
// set of hosts (see lib/serviceCatalog.ts and each NextAuth provider's avatar
// CDN) — enumerating every one would be a maintenance trap that silently
// breaks images whenever a provider changes CDNs, so img-src is scoped to
// https: rather than a host allowlist. Everything else is scoped tightly.
const contentSecurityPolicy = [
  "default-src 'self'",
  // Turbopack's dev HMR client relies on eval; production never does.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // Tailwind + inline `style={}` attributes (e.g. per-service accent colors)
  // are used throughout the UI — no nonce/hash plumbing for those yet.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data:",
  "media-src 'self' https://cdn.pixabay.com",
  "font-src 'self' data:",
  "connect-src 'self'",
  // NextAuth's sign-in redirect posts to each OAuth provider's authorize URL.
  "form-action 'self' https://accounts.spotify.com https://accounts.google.com https://github.com https://www.strava.com https://www.linkedin.com https://oauth.telegram.org",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // HSTS is a no-op over local HTTP dev; only takes effect once served over HTTPS.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
];

const nextConfig: NextConfig = {
  // The real Next.js config for this monorepo (the root `next.config.mjs` is
  // vestigial — see the comment in that file).
  //
  // Pin the workspace root explicitly. Next infers it from the nearest
  // lockfile, which is ambiguous the moment a stray lockfile appears inside a
  // workspace; pinning keeps output-file tracing and module resolution
  // deterministic across local, CI, and Vercel builds.
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
