# NextAuth v5 (beta) — CSRF & session hardening review

**Status:** review complete against `next-auth@5.0.0-beta.30`,
`session: { strategy: 'database' }`, config in `apps/web/lib/auth.ts`.
Re-run this review when upgrading off beta (§4).

## 1. Current posture — what protects what

| Surface | Protection | Assessment |
|---|---|---|
| `/api/auth/*` (NextAuth routes) | Framework CSRF: state parameter on OAuth flows + origin/host verification on POST callbacks; session cookie is `HttpOnly`, `SameSite=Lax`, `Secure` in production (`authjs.session-token`) | Sound by default. Do not add `cookiePrefix`/custom cookie tweaks without re-reviewing |
| Sign-in *initiation* | Rate-limited 20/min/IP in `proxy.ts` (in-memory, per instance) | Blunts credential-stuffing-adjacent abuse of OAuth redirects; distributed limiter needed at scale |
| Wrap generation | `lib/rateLimit.ts` 10/hour/user on cache-miss GET and every POST | Cached reads stay unlimited (cheap, single index lookup) |
| State-changing API routes (`POST /api/wrap/share`, `/api/connections/*`, `/api/account*`) | Session-cookie auth only; no separate CSRF token | **Accepted risk, see §2** |
| Session storage | DB-backed (`Session` table), opaque random token — no JWT claims to forge; revocable by row delete | Good; better than stateless JWT for account deletion |
| Tokens at rest | OAuth access/refresh encrypted AES-256-GCM in `Connection`; NextAuth `Account` rows keep framework-managed copies (reconciliation tracked as P0) | Encryption key handling documented in deploy/backup runbooks |
| Host header | `trustHost: true` set deliberately (serverless/proxy requirement) | Safe **only** behind ingress that controls `Host`. Never expose the app directly on wildcard DNS without TLS termination you own |
| Client errors/logs | `lib/logger.ts` redacts token-shaped strings and sensitive keys before console/Sentry | Verified unit-tested? No — covered by review only |

## 2. Accepted risk: SameSite=Lax as the CSRF boundary

All mutating endpoints are same-origin `fetch()` calls from our own UI. With
`SameSite=Lax`, cross-site POSTs from third-party pages do not carry the
session cookie, which blocks the classic CSRF shape. Residual exposure is the
legacy-browser / subdomain edge:

- Lax allows top-level **navigation** GETs to send cookies — none of our
  mutations are GETs (`GET /api/wrap` generates, but it's rate-limited and
  idempotent-ish; it cannot leak another user's data).
- A sibling-subdomain attacker (`evil.app.example.com`) could still ride
  cookies. Mitigate operationally: don't host user content on subdomains of
  the app's registrable domain.

**Trigger to revisit:** if we ever add non-GET mutations callable via simple
forms/images, or relax cookies, add double-submit tokens or NextAuth's built-in
CSRF helpers to those routes.

## 3. Hardening follow-ups (tracked)

- [ ] Distributed rate limiting (Redis/Upstash) — current limiter resets per instance
- [ ] Purge expired `Session`/`VerificationToken` rows on a schedule
- [ ] Reconcile plaintext tokens in NextAuth `Account` vs encrypted `Connection` (P0 item)
- [ ] Pen test before public launch (P0 item — external work, not code)

## 4. Upgrade path off beta

NextAuth v5 has been in extended beta; plan the move when stable ships:

1. **Pin now:** depend on the exact beta version (`~5.0.0-beta.N`), not `^`,
   so minor betas can't drift config semantics under you.
2. **Watch the changelog** between pinned beta → stable for: adapter API
   changes (`@auth/prisma-adapter` must bump in lockstep), cookie name changes
   (would invalidate live sessions — force sign-out or map old cookies),
   callback signature changes.
3. **Upgrade steps:** bump both packages together → run the unit suite
   (`npm run test` covers auth-dependent routes with mocks) → E2E smoke
   (`login → dashboard → wrap → share`) against a staging database → ship.
4. **Fallback:** if stable lands breaking changes we can't absorb immediately,
   staying on the last pinned beta is acceptable short-term; it receives no
   fixes, so timebox it.

## 5. Verification performed in this review

- `grep` for custom cookie/session configuration — none beyond defaults.
- Confirmed all mutation routes begin with `auth()` + explicit user-id scoping
  (`userId_year` / `userId_provider` unique lookups); no route accepts a
  client-supplied user id.
- Confirmed `share/[shareId]` public page exposes only snapshot data (no PII
  beyond display name) and is opt-in per wrap.
