# Production deployment runbook

**Status:** procedure defined; no production environment provisioned yet.
Read alongside `docs/staging-environment.md` (staging parity — also not yet
provisioned) and `docs/runbooks/postgres-backup-restore.md` (**no backups exist
until that checklist is adopted**). Do not point real users at a deployment
until the adoption checklist at the bottom of each of those documents is done.

## 1. Prerequisites

| Component | Requirement |
|---|---|
| Postgres | Managed instance (Neon/Supabase/RDS). Note the **pooled** connection string (pgBouncer port 6543 on Supabase, `-pooler` host on Neon) and the **direct** one for migrations |
| OAuth apps | One set per environment (never share dev/prod apps): Spotify, Google, GitHub, LinkedIn, Strava. Callback URL: `https://<your-domain>/api/auth/callback/<provider>` |
| Domain | HTTPS required — OAuth providers reject plain HTTP callbacks |

## 2. Environment variables

`apps/web/lib/env.ts` validates these at import time; missing required values
crash the process immediately (fail fast, not half-booted).

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Pooled connection string for the app runtime |
| `DIRECT_URL` | recommended | Direct (non-pooled) string; `prisma.config.ts` uses it for CLI/migrations |
| `NEXTAUTH_SECRET` | yes | `openssl rand -base64 32`; rotating it invalidates all sessions |
| `ENCRYPTION_KEY` | yes | 64 hex chars (32 bytes). Encrypts stored OAuth tokens. **Store outside the DB backup** — see backup runbook. Rotating invalidates every stored token |
| `SPOTIFY_CLIENT_ID/_SECRET` | yes | |
| `GITHUB_CLIENT_ID/_SECRET` | yes | |
| `GOOGLE_CLIENT_ID/_SECRET` | yes | |
| `LINKEDIN_CLIENT_ID/_SECRET` | yes | Required by the schema even though only sign-in is wired |
| `STRAVA_CLIENT_ID/_SECRET` | yes | |
| `TELEGRAM_*`, `DUOLINGO_*`, `LETTERBOXD_*` | no | Stubs; safe to omit |
| `WRAP_YEAR` | no | Pin the recap year; default is recap-season logic (`lib/wrapYear.ts`) |
| `SENTRY_DSN` | no | Enables error forwarding via `lib/errorMonitoring.ts` |
| `NEXTAUTH_URL` | recommended | Canonical origin when behind proxies/CDNs |

Scopes per provider are documented in `docs/oauth-scopes.md`.

## 3. Database schema

**Honest status:** `prisma/migrations/` is currently empty — schema has been
applied with `prisma db push` in development. Before production:

```bash
# One-time baseline (run locally against the production database):
npx prisma migrate dev --name init   # generates prisma/migrations/*_init
git commit prisma/migrations         # check them in — this is the P0 blocker

# Every deploy (CI step or release job):
npx prisma migrate deploy            # applies pending migrations, non-interactive
```

Do not use `db push` against production: it diffs and can drop columns/data
without warning. The backup runbook's "pre-migration dump" rule assumes real
migrations exist.

## 4. Deploying (Vercel)

The monorepo root is the project root; Vercel auto-detects the `apps/web`
workspace app.

1. Import the repo; set **Root Directory** to `apps/web` if the wizard doesn't
   detect the workspace (Next 16 resolves the workspace root via
   `turbopack.root` in `apps/web/next.config.ts`).
2. Build command: default (`next build`). Install command: default (`npm ci`
   at the workspace root). Add `npx prisma generate` as a build step if the
   generated client is stale.
3. Add all env vars from §2 to the project (Production scope).
4. Deploy, then verify:
   - `GET https://<domain>/api/health` → `{"status":"ok","db":"ok"}` (503 means
     the database is unreachable — check `DATABASE_URL` / pooling mode).
   - Sign in with one provider end-to-end; confirm a row appears in `Connection`
     and `AuditLog`.
   - Generate a wrap; confirm slides render and `POST /api/wrap/share` returns
     a `shareUrl`.

### Other hosts

Any Node 20+ host works: `npm ci && npx prisma generate && npm run build &&
npm run start` from `apps/web`. Set `PORT` as needed. Behind a reverse proxy,
`trustHost: true` (set deliberately in `lib/auth.ts`) requires you to control
the `Host` header — terminate TLS and forward requests only from your own
ingress.

## 5. Error monitoring

Today: `lib/errorMonitoring.ts#reportError` posts a minimal Sentry envelope
when `SENTRY_DSN` is set (no SDK dependency); otherwise errors degrade to the
structured logger. Wired into: global error boundary (`app/error.tsx`),
`GET/POST /api/wrap`, and the wrap client island.

Upgrade path when volume justifies an SDK: install `@sentry/nextjs`,
run `npx @sentry/wizard -i nextjs`, replace the manual envelope call in
`sendToSentry()` with `Sentry.captureException`, keep `reportError()` as the
single seam so call sites don't change.

## 6. Known scaling gaps (documented, not hidden)

- **Rate limiting is in-memory per instance** (`lib/rateLimit.ts`,
  `proxy.ts`). Multiple serverless instances each get their own budget. Move
  to Upstash/Redis before serious traffic.
- **Connection pooling**: the pg adapter opens one pool per instance. On
  serverless with high concurrency use a pooled `DATABASE_URL` (pgBouncer
  transaction mode) or Prisma Accelerate; use `DIRECT_URL` for migrations only.
- **Expired sessions accumulate** in `Session`/`VerificationToken`. Schedule a
  cleanup job (`DELETE FROM "Session" WHERE expires < now()`) until a proper
  cron ships.
- **Wrap generation runs inline** in the request (bounded fan-out to four
  providers). A queue/worker belongs on the P2 list.

## 7. Rollback

1. Redeploy the previous git SHA (Vercel: instant rollback to prior build).
2. Schema rollbacks are **manual** — `migrate deploy` never auto-downgrades.
   If a release needs a schema revert, restore the pre-migration dump per
   `docs/runbooks/postgres-backup-restore.md` (which also reminds you: keep
   `ENCRYPTION_KEY` stable across restores or every stored token decrypts to
   garbage).

## Adoption checklist

- [ ] Production Postgres provisioned; pooled + direct URLs obtained
- [ ] Per-environment OAuth apps created, callbacks registered
- [ ] `prisma/migrations/` baselined and checked in (P0 blocker)
- [ ] Env vars set; `/api/health` green
- [ ] Backup schedule live per postgres-backup-restore.md; restore drill done
- [ ] Error monitoring verified (throw a test error, see it land in Sentry)
- [ ] Uptime monitor pointed at `/api/health`
