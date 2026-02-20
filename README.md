# OmniWrap

OmniWrap is a centralized, all-in-one year-in-review platform that aggregates personalized "Wrapped"-style summaries from multiple digital services. It combines data from music streaming, video platforms, fitness apps, social media, gaming, learning tools, and more into a single, visually engaging, holistic recap of your digital year.

## Overview

Inspired by individual service recaps (e.g., Spotify Wrapped, Apple Music Replay, YouTube Recap, Strava Year in Sport), OmniWrap provides cross-category insights, such as total time spent across listening, watching, exercising, and gaming, eliminating the need to check each app separately.

As of December 24, 2025, the 2025 recap season is fully underway—most major services have released their individual recaps, making it the perfect time to generate your unified OmniWrap.

## Project Folder Structure

A recommended monorepo structure for building OmniWrap using Next.js (frontend + API routes):

```text
omniwrap/
├── .github/                  # GitHub workflows (CI/CD)
├── apps/
│   └── web/                  # Next.js app (frontend + serverless API)
│       ├── app/              # Next.js App Router pages
│       │   ├── (auth)/       # Auth routes (login, callback)
│       │   ├── dashboard/    # User dashboard, connections
│       │   ├── wrap/         # Wrap generation and view
│       │   └── api/          # Serverless API routes (e.g., oauth callbacks)
│       ├── components/       # Reusable UI components (cards, charts)
│       ├── lib/              # Utilities (OAuth helpers, data processors)
│       ├── public/           # Static assets (images, themes)
│       └── styles/           # Global styles
├── packages/
│   ├── ui/                   # Shared UI components (if multi-app)
│   └── config/               # Shared config (env, types)
├── prisma/                   # Database schema (if using Prisma)
├── scripts/                  # Deployment scripts, data migration
├── .env.example              # Environment variables template
├── next.config.js            # Next.js config
├── package.json              # Root dependencies
├── tsconfig.json             # TypeScript config
└── README.md                 # Project overview
```

- **Backend-heavy alternative:** Separate `apps/api` (Node/Express or Fastify) for persistent services, background jobs (e.g., data refresh queues).
- **Database:** Use Supabase, PlanetScale, or Render Postgres for user data, tokens, and cached wraps.

## Architecture and Technical Structure

- **Frontend:** Next.js 14+ (App Router) for SSR/SSG, responsive UI with Tailwind CSS. Interactive story-like flow using Framer Motion or Swiper.
- **Backend:** Serverless functions for OAuth flows, data fetching, and aggregation. Optional dedicated server for heavy processing.
- **Database:** Relational (Postgres) for users, connections, and preferences. Secure storage of refresh tokens (encrypted).
- **Authentication:**
    - **OmniWrap accounts:** NextAuth.js or Clerk (supports email, Google/Apple sign-in).
    - **Service integrations:** OAuth 2.0 with PKCE.
- **Data Processing:** Secure, on-demand fetching via service APIs. Temporary in-memory aggregation; optional caching for performance.
- **Deployment:**
    - **Recommended:** Vercel for Next.js optimization, previews, and edge caching.
    - **Alternative/Hybrid:** Render for managed Postgres, background workers, or Docker containers.
- **CI/CD:** GitHub Actions for automated tests/deploys.

## Key Features

### Supported Integrations
- **Music:** Spotify, Apple Music, YouTube Music
- **Video/Entertainment:** YouTube, Netflix (via manual exports)
- **Fitness/Health:** Strava, Fitbit, Apple Health
- **Social/Community:** Reddit, X/Twitter, Instagram
- **Learning/Productivity:** Duolingo, Goodreads, RescueTime
- **Gaming:** Steam, PlayStation, Xbox

### Unified Recap
- Aggregated metrics (e.g., total hours across categories)
- Top lists, milestones, and trends
- Year-over-year comparisons (if historical data available)
- Customizable themes and focus areas

### Sharing
- Social-optimized images/stories, friend comparisons (opt-in)

### Extras
- Global anonymized trends, export options (PDF, images)

## Authentication and Data Integration

- **Primary:** OAuth 2.0 (PKCE) for all supported services—secure, compliant, no password handling.
- **Why OAuth?:** Required by platforms, allows revocable access, and builds user trust.
- **Fallbacks:** Manual data uploads (CSV/JSON exports) for limited-API services; public profile links where available.
- **User Accounts:** Required for saving connections/preferences. Guest mode is available for one-time wraps.

## Privacy and Security

- **Compliance:** GDPR/CCPA compliant.
- **Storage:** Temporary data processing; no long-term raw data storage.
- **Encryption:** All tokens are encrypted; user-controlled revocations and deletions.
- **Integrity:** No selling or unauthorized sharing of personal data.

## Release and Update Schedule

OmniWrap aligns with the year-end recap season for maximum data availability:
- **Primary Generation Window:** Late November to mid-January.
- **Starts:** ~November 25 (e.g., YouTube Music Recap).
- **Peaks:** early December (Apple Music Replay Dec 2, Spotify Wrapped Dec 3, YouTube Recap Dec 2).
- **Continues:** mid-December+ (Strava Year in Sport ~Dec 8, others into January).
- **On-Demand:** Available year-round for custom periods or previous years.
- **Auto-Refresh:** Notifications when new data releases from connected services.
- **Data Cutoff:** Mirrors sources (typically mid-November to early December).
- **Wrap Availability:** Stored indefinitely for logged-in users.

## Getting Started

1. Visit omniwrap.com and sign up/login.
2. Connect services via secure OAuth.
3. Generate your unified wrap.
4. Customize, view, and share.

## Development Setup

If you are a developer looking to contribute or run OmniWrap locally:

### Prerequisites
- Node.js 18+ (20+ recommended)
- PostgreSQL database
- Environment variables configured (see `.env.example`)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-repo/omniwrap.git
   cd omniwrap
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up the database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

*Note: Basic features are free; premium tiers are available for advanced options like early access and deeper analytics.*
