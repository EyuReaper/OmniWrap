# OmniWrap

OmniWrap is a year-in-review platform that aggregates personalized "Wrapped"-style summaries from the digital services you actually use. It combines data from music streaming, video platforms, fitness apps, and coding services into a single, visually engaging recap of your digital year.

## Overview

Inspired by individual service recaps (e.g., Spotify Wrapped, Apple Music Replay, YouTube Recap, Strava Year in Sport), OmniWrap gives you cross-category insights such as total tracked time across listening and watching, without having to check each app separately.

## Project Folder Structure

```text
omniwrap/
├── .github/                  # GitHub workflows (CI) and Dependabot config
├── apps/
│   └── web/                  # Next.js app (frontend + serverless API)
│       ├── app/              # Next.js App Router pages + API routes
│       ├── components/       # Reusable UI components
│       ├── e2e/              # Playwright end-to-end tests
│       ├── lib/              # Auth, service fetchers, aggregation, utils
│       └── public/           # Static assets
├── prisma/                   # Database schema + migrations
├── scripts/                  # Developer tooling
├── .env.example              # Environment variables template
└── package.json              # Root workspace + scripts
```

- **Backend:** Serverless API routes for OAuth callbacks, data fetching, and wrap aggregation.
- **Database:** Postgres (Prisma) for users, connections, and cached wraps. OAuth refresh tokens are AES-256-GCM encrypted at rest.

## Architecture and Technical Structure

- **Frontend:** Next.js 16 (App Router) with Server Components; the interactive wrap playback is a client island (Swiper + Framer Motion + Recharts).
- **Authentication:** NextAuth v5 (beta) with database sessions. OmniWrap accounts are OAuth-only — no passwords.
- **Service integrations:** OAuth 2.0 with per-service least-privilege scopes.
- **Data Processing:** On-demand fetching via service APIs, retried with backoff. Wraps are cached per user per year with stale-while-revalidate.
- **Deployment:** Vercel (frontend + API) with managed Postgres. See `docs/production-deployment.md`.

## Key Features

### Live integrations
- **Spotify** — top artist, top track, listening time (estimated from recently played tracks)
- **YouTube** — top liked video, watch time (estimated from liked videos), top category
- **GitHub** — total commits, top repository, languages
- **Strava** — total distance, activities, athletes' year in full (paginated)

**LinkedIn** connects via OAuth but currently contributes no wrap data. **Telegram**, **Duolingo**, and **Letterboxd** are marked "Coming soon" until real APIs exist. All metrics are fetched from real provider APIs — never fabricated — and the UI labels clearly what is estimated.

### The wrap
- Immersive story-style playback with keyboard navigation, slide progress, and screen-reader announcements
- Per-provider slides that tell you exactly what's missing ("Connect Spotify to unlock")
- Honest aggregation: only real, measured time counts toward hours; commits and km appear as their own counts
- Multiple themes for the share card (Omni Dark, Cyberpunk, Sunset, Minimal)
- Wraps are generated per calendar year and can be re-viewed or re-connected to previous years
- Public share snapshots (opt-in) with generated Open Graph images

### Sharing
- Download share cards in Card / Square (1:1) / Story (9:16) formats with optional watermark
- Native share sheet (Web Share API), copy link, and "Share to X"
- Copy a deep link to any slide (e.g. `?slide=spotify`)

## Privacy and Security

- **Encryption:** OAuth tokens are AES-256-GCM encrypted at rest; refresh tokens rotate with reuse tracking.
- **Data control:** Export all your data or permanently delete your account at any time; disconnect individual services.
- **Integrity:** No selling or unauthorized sharing of personal data. See [Privacy Policy](https://omniwrap.app/privacy) and [Terms](https://omniwrap.app/terms).
- **Audit logging:** Sensitive actions (connect/disconnect/delete/export) are recorded.

## Getting Started

1. Visit the app, sign in with any of the supported OAuth providers, and connect your services.
2. Open the dashboard and hit **Generate Your Wrap**.
3. View your recap, switch themes, and share it.

## Development

From the repo root:

```bash
npm install          # installs the full workspace (one lockfile at the root)
npm run dev          # dev server at localhost:3000
npm run lint         # ESLint
npm run typecheck    # TypeScript (tsc --noEmit)
npm run test         # unit tests (Vitest)
npm run build        # production build
```

Prisma commands run from the root via `npx prisma <cmd>`. See `AGENTS.md` for the full contributing guide, environment variables, and the production-readiness checklist.

*OmniWrap is a single-tier product — no premium plans, no guest mode.*
