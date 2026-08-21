# OAuth scopes — least-privilege reference

Every provider is scoped to the minimum the wrap fetcher actually calls. If a
scope is not listed here, it is deliberately **not** requested. When adding a
new API call to a service in `lib/services/`, extend only the scope it needs
and update this table in the same PR.

Scopes are configured in `apps/web/lib/auth.ts`. Changing a scope changes what
existing users granted at sign-in — new scopes require re-consent (the user
reconnects the service); removed scopes simply stop being requested for new
sign-ins.

## Active providers

| Provider | Scope(s) | Why | Deliberately excluded |
|---|---|---|---|
| Spotify | `user-top-read` `user-read-recently-played` | Top tracks/artists/genres and recently-played minutes for the music slide (`lib/services/spotify.ts`) | `playlist-read-private`, `playlist-read-collaborative`, `user-follow-read`, `user-library-read`, `user-modify-*` |
| Spotify | `user-read-email` `user-read-private` | Profile claims NextAuth needs to create/link the account (`email`, display name, avatar) | — |
| Google | `youtube.readonly` | Liked videos + watch-hour estimation for the YouTube slide (`lib/services/youtube.ts`) | `youtube.force-ssl`, any write scope, Drive/Gmail scopes |
| Google | `userinfo.email` `userinfo.profile` | Account identity for sign-in | — |
| GitHub | *(default — none)* | `/user`, `/user/repos`, `/search/commits` all work unauthenticated-scoped; grants public-data read-only. No repo write, no workflow access | `repo`, `read:org`, `workflow`, `gist`, `delete_repo` — never needed |
| Strava | `read` `activity:read` | Profile name + own activity summaries for the fitness slide | `activity:read_all` (private-only activities), `profile:write`, `activity:write` |
| LinkedIn | `openid` `profile` `email` | Sign-in identity only. There is no LinkedIn data fetcher yet; if one ships it must justify its scopes here | `w_member_social` and everything else |

## Manual / stub providers

- **Duolingo** — manual username flow (`app/api/connections/manual/route.ts`),
  no OAuth scope involved.
- **Telegram** — webhook-based stub; guarded by `TELEGRAM_WEBHOOK_SECRET`,
  no user OAuth.
- **Letterboxd** — provider stub defined but not wired into `providers`; no
  scopes are live.

## Rotation / revocation notes

- Tokens are re-encrypted (AES-256-GCM) and stored per-user in `Connection`;
  refresh uses each provider's token endpoint with the same scope set (scopes
  cannot be narrowed on refresh without user consent).
- Users revoke via the dashboard disconnect button **and** should be pointed
  at the provider's own app-permissions page:
  - Spotify: <https://www.spotify.com/account/apps/>
  - Google: <https://myaccount.google.com/permissions>
  - GitHub: <https://github.com/settings/apps> → *Installed GitHub Apps / Authorized OAuth Apps*
  - Strava: <https://www.strava.com/settings/apps>
  - LinkedIn: <https://www.linkedin.com/psettings/permitted-services>

If you add a provider, add its revocation URL here too.
