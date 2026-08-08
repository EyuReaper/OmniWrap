import path from "node:path";
import type { NextConfig } from "next";

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
};

export default nextConfig;
