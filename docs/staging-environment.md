# Staging environment parity

**Status:** specification, **not yet provisioned.** There is currently one
environment (local dev) and no deployed staging or production. This document
defines what staging must look like so the first deploy creates it correctly
rather than retrofitting it later.

---

## 1. Why staging needs to exist here specifically

OmniWrap's riskiest surfaces cannot be exercised locally with any fidelity:

- **OAuth redirect URIs** are registered per-app with each provider. A callback
  that works on `localhost:3000` proves nothing about a deployed origin — this
  is the single most common way a deploy breaks sign-in.
- **Token refresh** (`apps/web/lib/services/base.ts`) only triggers near real
  expiry, so it is rarely observed in a short local session.
- **Database sessions** (`session: { strategy: "database" }`) behave differently
  under a connection pooler than against a direct local Postgres.
- **`prisma db push` is destructive.** Practising a schema change against
  staging data is the only cheap way to find out that it drops a column.

---

## 2. Parity matrix

"Must match" means a difference here invalidates staging as a test of
production.

| Dimension | Production | Staging | Parity |
|---|---|---|---|
| Runtime | Node version pinned in `package.json`/`.nvmrc` | Same | **Must match** |
| Next.js build | `next build` (Turbopack), `NODE_ENV=production` | Same command, same flags | **Must match** |
| Postgres | Managed, major version *N* | Managed, major version *N* | **Must match** (major version) |
| Connection pooling | Pooler in front, `DIRECT_URL` for migrations | Same topology | **Must match** — pooler-only bugs are invisible otherwise |
| Schema | Applied by `prisma migrate deploy` | Same, applied first | **Must match** |
| Region | e.g. `iad1` | Same | Should match — latency to providers differs by region |
| Database instance | Dedicated | **Separate instance** | **Must differ** |
| `ENCRYPTION_KEY` | Production key | **Distinct key** | **Must differ** |
| `NEXTAUTH_SECRET` | Production secret | **Distinct secret** | **Must differ** |
| OAuth apps | Production client IDs | **Separate OAuth app per provider** | **Must differ** |
| `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL` | `https://omniwrap.app` | `https://staging.omniwrap.app` | **Must differ** |
| Search indexing | `robots: index, follow` | `noindex` | **Must differ** |
| Data | Real user data | Synthetic accounts only | **Must differ** — see §4 |
| Scale | Production instance sizes | Smaller is fine | May differ |

### Separate OAuth apps are non-negotiable

Every provider validates the redirect URI against the ones registered for that
client ID. Sharing one OAuth app between staging and production means
registering a staging callback on the production app — which lets a staging
deploy mint tokens that production issued. Register a second app per provider
(Spotify, Google, GitHub, Strava, LinkedIn) with only the staging callback.

Callback URL shape, per provider:
`https://staging.omniwrap.app/api/auth/callback/<provider>`

---

## 3. Environment variables

Staging needs the same variable *names* as `.env.example` with different
*values*. `apps/web/lib/env.ts` validates at import time and crashes the process
on anything missing, so an incomplete staging config fails loudly at boot rather
than at first use — treat a boot crash as the expected signal, not a surprise.

Required in every deployed environment (from `lib/env.ts`):

```
DATABASE_URL            DIRECT_URL (for migrations)
NEXTAUTH_SECRET         NEXTAUTH_URL
ENCRYPTION_KEY          NEXT_PUBLIC_APP_URL
SPOTIFY_CLIENT_ID/_SECRET       GOOGLE_CLIENT_ID/_SECRET
GITHUB_CLIENT_ID/_SECRET        STRAVA_CLIENT_ID/_SECRET
LINKEDIN_CLIENT_ID/_SECRET
```

Generate per-environment secrets — never copy production values down:

```bash
openssl rand -base64 32   # NEXTAUTH_SECRET
openssl rand -hex 32      # ENCRYPTION_KEY (must be 64 hex chars)
```

---

## 4. Data policy

**Do not clone production data into staging.** `Connection` rows hold
AES-encrypted OAuth access and refresh tokens — live credentials for real
people's Spotify, Google, GitHub, and Strava accounts. Copying them multiplies
the blast radius of a staging compromise onto production user accounts, and
staging is by definition the less-hardened environment.

Seed staging by signing up a handful of dedicated test accounts against the
staging OAuth apps and connecting them normally. That also exercises the sign-in
and connection-upsert paths, which a data copy would skip.

If production-shaped *volume* is ever needed for query-plan work, generate
synthetic rows; leave `accessToken`/`refreshToken` null and exercise the
`expired`/`error` connection states, which are the interesting ones anyway.

---

## 5. Promotion flow

```
PR  ──▶ preview deploy (ephemeral, staging database)
    ──▶ merge to main ──▶ staging deploy ──▶ smoke check ──▶ promote to production
```

Each deploy, in order:

1. `prisma migrate deploy` against `DIRECT_URL` (never `db push` in a deployed
   environment — see the backup runbook).
2. `next build`.
3. Smoke check: landing page renders; `/signin` lists providers; one OAuth
   round-trip completes; `/dashboard` shows correct connection status;
   `/wrap` returns a cached wrap.
4. Promote the identical build artifact — rebuild-per-environment reintroduces
   the drift staging exists to catch.

Preview deploys share the staging database. That is acceptable because staging
holds only synthetic data (§4); it would not be if §4 were violated.

---

## 6. Adoption checklist

- [ ] Register staging OAuth apps for all five providers
- [ ] Provision the staging Postgres instance (same major version + pooler topology)
- [ ] Populate staging env vars with freshly generated secrets
- [ ] Add `noindex` for the staging origin
- [ ] Wire preview deploys to the staging database
- [ ] Add the §5 smoke check to CI (tracked as a P1 item in `AGENTS.md`)
- [ ] Pin the Node version (`.nvmrc` / `engines`) so all three environments agree
