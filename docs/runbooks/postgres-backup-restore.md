# Runbook: Postgres backup & restore

**Status:** procedure defined, **not yet provisioned.** No managed database, no
scheduled backup job, and no restore drill exist for OmniWrap today. Everything
below is written to be executed as-is once a database is provisioned; the
"Adoption checklist" at the end lists what is still missing.

**Audience:** whoever is on call for OmniWrap.
**Scope:** the single Postgres database behind `DATABASE_URL` — the only
stateful component. The Next.js app is stateless and redeployable from git.

---

## 1. What is actually at risk

| Data | Model | Recoverable without a backup? |
|---|---|---|
| Users & sessions | `User`, `Session`, `VerificationToken` | No — users would have to sign in again (tolerable) |
| OAuth links | `Account` | No, but users can re-authorize |
| Encrypted provider tokens | `Connection.accessToken` / `.refreshToken` | No — but see the encryption-key warning below |
| Generated wraps | `Wrap.data` | Regenerable *only* while the provider tokens still work and the provider still serves that year's data. Treat as **not** regenerable. |
| Public share links | `Wrap.shareId` | No — losing these breaks every URL already shared publicly |

`Wrap.data` and `Wrap.shareId` are the genuinely irreplaceable rows: a wrap is a
point-in-time snapshot of third-party APIs, and Spotify/GitHub/Strava will not
serve last year's numbers again on request.

### ⚠️ The backup is useless without `ENCRYPTION_KEY`

`Connection.accessToken` and `Connection.refreshToken` are AES-256-GCM
ciphertext (`apps/web/lib/crypto.ts`), keyed by the `ENCRYPTION_KEY` env var.
That key lives **outside** the database and is therefore **not** in any
`pg_dump`.

Restoring a dump against a different `ENCRYPTION_KEY` yields a database where
every provider connection silently fails to decrypt and every user must
reconnect every service.

**Back up `ENCRYPTION_KEY` in the secret manager, with the same retention as the
database backups, and record which key version each backup was taken under.**

---

## 2. Backup policy

| Setting | Value | Rationale |
|---|---|---|
| Automated snapshot | Daily, provider-managed | Baseline; every managed Postgres offers this |
| Point-in-time recovery (PITR) | Enabled, 7-day window | Recovers from a bad migration or mass delete, not just host loss |
| Logical dump (`pg_dump`) | Weekly, retained 90 days | Provider snapshots are usually restorable *only* onto that provider. A logical dump is the vendor-exit and long-horizon copy. |
| Off-provider copy | Weekly dump to separate object storage | Survives account-level loss of the DB provider |
| Pre-migration dump | Every time, manual | See §3 |
| Restore drill | Quarterly | A backup that has never been restored is a hypothesis |

Recap season (Nov–Jan) is when `Wrap` rows are created and when share links get
posted publicly. Raise dump frequency to daily for that window.

---

## 3. Taking a backup

### Before every schema change (mandatory)

Schema changes are the most likely cause of data loss in this codebase, because
`prisma/migrations/` is empty and the schema is currently applied with
`prisma db push` — which will drop columns to make the database match
`schema.prisma`, without a reversible migration to roll back to.

```bash
# From the repo root, with DIRECT_URL/DATABASE_URL pointing at production.
pg_dump "$DIRECT_URL" \
  --format=custom \
  --no-owner --no-acl \
  --file="omniwrap-pre-migration-$(date +%Y%m%dT%H%M%SZ).dump"
```

Verify the dump is non-trivial before proceeding (`ls -lh`, expect ≫ 0 bytes),
then apply the schema change.

### Routine logical dump

```bash
pg_dump "$DIRECT_URL" --format=custom --no-owner --no-acl \
  --file="omniwrap-$(date +%Y%m%d).dump"

# Upload to off-provider storage, then verify the copy is readable:
pg_restore --list omniwrap-$(date +%Y%m%d).dump | head
```

Use `DIRECT_URL` rather than `DATABASE_URL`: if a connection pooler
(PgBouncer/Supabase pooler) is ever put in front of the database, `pg_dump`
needs the direct, session-mode connection.

### Data-only dump (for seeding staging)

```bash
pg_dump "$DIRECT_URL" --format=custom --data-only --no-owner --no-acl \
  --exclude-table-data='"Session"' \
  --exclude-table-data='"VerificationToken"' \
  --file="omniwrap-data-$(date +%Y%m%d).dump"
```

Sessions and verification tokens are short-lived and never worth copying. See
`docs/staging-environment.md` before copying **any** production rows into
staging — the tokens are user credentials.

---

## 4. Restore

### 4a. Restore into a fresh database (full recovery)

```bash
# 1. Provision an empty Postgres 16+ database; export its URL.
export RESTORE_URL="postgresql://…"

# 2. Restore. --clean --if-exists makes the command re-runnable after a failure.
pg_restore --dbname="$RESTORE_URL" \
  --no-owner --no-acl \
  --clean --if-exists \
  --exit-on-error \
  omniwrap-YYYYMMDD.dump

# 3. Confirm the schema matches what the app expects.
#    Prints a diff if the live database has drifted from schema.prisma.
DIRECT_URL="$RESTORE_URL" npx prisma migrate diff \
  --from-url "$RESTORE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --exit-code
#    Exit code 2 = drift. Reconcile before pointing the app at this database.

# 4. Sanity-check row counts against expectations.
psql "$RESTORE_URL" -c '
  SELECT ''User'' AS model, count(*) FROM "User"
  UNION ALL SELECT ''Connection'', count(*) FROM "Connection"
  UNION ALL SELECT ''Wrap'', count(*) FROM "Wrap"
  UNION ALL SELECT ''Wrap (public)'', count(*) FROM "Wrap" WHERE "isPublic";'
```

Then repoint the app:

1. Set `DATABASE_URL` and `DIRECT_URL` to the restored database.
2. Confirm `ENCRYPTION_KEY` is the value that was in effect **when the dump was
   taken** (see §1).
3. Redeploy — the app reads both at process start (`apps/web/lib/env.ts`), so a
   restart is required; changing the env var alone is not enough.

### 4b. Point-in-time recovery (bad migration / mass delete)

Prefer PITR over the weekly dump when the incident happened within the retention
window — it loses minutes instead of days.

1. Identify the last-good timestamp (deploy log, migration start time).
2. Ask the provider to restore to `T-1 minute` **into a new instance**. Never
   restore in place: it destroys the evidence and any writes since.
3. Verify with §4a steps 3–4, then repoint.

### 4c. Single-model recovery

To recover only `Wrap` rows (the common case: a bad aggregation run overwrote
good data — `Aggregator.generateWrap` upserts on `(userId, year)`), restore the
dump to a scratch database and copy the rows across rather than restoring the
whole production database:

```bash
pg_restore --dbname="$SCRATCH_URL" --no-owner --no-acl \
  --table='"Wrap"' omniwrap-YYYYMMDD.dump
# Then reconcile the specific rows with an explicit INSERT … ON CONFLICT.
```

---

## 5. Verification drill (quarterly)

Run 4a against a scratch database and record, in the incident/ops log:

- dump timestamp and file size,
- wall-clock time to complete the restore (this is the real RTO),
- `prisma migrate diff` exit code,
- row counts from §4a step 4,
- confirmation that a `Connection` row decrypts under the archived
  `ENCRYPTION_KEY`.

Drop the scratch database afterwards — it contains real user tokens.

---

## 6. Adoption checklist

- [ ] Provision managed Postgres with daily snapshots + 7-day PITR
- [ ] Store `ENCRYPTION_KEY` in a secret manager, versioned, with backup-era mapping
- [ ] Schedule the weekly `pg_dump` to off-provider object storage (90-day retention)
- [ ] Check in real Prisma migrations so a restored schema is reproducible from git
      (tracked as a P0 item in `AGENTS.md`; `db push` alone makes §3 mandatory)
- [ ] Run the first restore drill and record the measured RTO here
- [ ] Add DB connectivity to a health check endpoint so a bad repoint is caught immediately
