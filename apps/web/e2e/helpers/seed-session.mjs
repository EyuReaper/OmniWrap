// Seeds the database with a real user, session, connections, and a fixture
// wrap so Playwright can exercise the authenticated dashboard + wrap flows
// without a real OAuth handshake. Run before the app starts:
//   node e2e/helpers/seed-session.mjs
//
// NextAuth v5 database sessions: the session cookie is `authjs.session-token`
// (http) and its value is the Session.sessionToken column — the Playwright
// spec sets that cookie, and the server resolves it against this row.
import 'dotenv/config';
import crypto from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const SESSION_TOKEN = process.env.E2E_SESSION_TOKEN ?? 'e2e-session-token';
const EMAIL = 'e2e@example.com';
const USER_ID = 'e2e-user-id';
// Mirror lib/wrapYear.ts so seeds land on the year the app will actually ask for.
const YEAR = Number(
  process.env.WRAP_YEAR ??
    (new Date().getMonth() < 3 ? new Date().getFullYear() - 1 : new Date().getFullYear()),
);

function encrypt(text) {
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

const fixtureWrap = {
  spotify: {
    topSong: 'E2E Song',
    topArtist: 'E2E Artist',
    minutes: 3000,
    topGenre: 'test pop',
    minutesNote: 'Estimated from 50 recently played tracks',
  },
  google: {
    channelName: 'E2E Channel',
    topVideo: 'E2E Video',
    watchHours: 40,
    topCategory: 'tech',
    likedVideoCount: 30,
    watchHoursNote: 'Estimated from 30 liked videos',
  },
  github: {
    username: 'e2e-user',
    commits: 123,
    topRepo: 'e2e-repo',
    languages: ['TypeScript'],
    totalStars: 42,
  },
  strava: { distanceKm: 800, activities: 120, topSport: 'Run', elevationGain: 3000 },
  aggregated: { totalHours: 90, topCategory: 'Music' },
  providerStatus: {
    spotify: { ok: true },
    google: { ok: true },
    github: { ok: true },
    strava: { ok: true },
  },
};

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO "User" (id, name, email, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, now(), now())
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, "updatedAt" = now()`,
      [USER_ID, 'E2E User', EMAIL],
    );

    await client.query(`DELETE FROM "Session" WHERE "userId" = $1`, [USER_ID]);
    await client.query(
      `INSERT INTO "Session" (id, "sessionToken", "userId", expires)
       VALUES ($1, $2, $3, $4)`,
      ['e2e-session-id', SESSION_TOKEN, USER_ID, new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)],
    );

    const providers = ['spotify', 'google', 'github', 'strava'];
    const token = encrypt('e2e-fake-access-token');
    const refresh = encrypt('e2e-fake-refresh-token');
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    for (const provider of providers) {
      await client.query(
        `INSERT INTO "Connection" (id, "userId", provider, "accessToken", "refreshToken", "expiresAt", status, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, 'connected', now(), now())
         ON CONFLICT ("userId", provider) DO UPDATE SET
           "accessToken" = EXCLUDED."accessToken",
           "refreshToken" = EXCLUDED."refreshToken",
           "expiresAt" = EXCLUDED."expiresAt",
           status = 'connected',
           "updatedAt" = now()`,
        [`e2e-conn-${provider}`, USER_ID, provider, token, refresh, expires],
      );
    }

    await client.query(
      `INSERT INTO "Wrap" (id, "userId", year, data, "isPublic", "createdAt")
       VALUES ($1, $2, $3, $4::jsonb, false, now())
       ON CONFLICT ("userId", year) DO UPDATE SET data = EXCLUDED.data`,
      ['e2e-wrap-id', USER_ID, YEAR, JSON.stringify(fixtureWrap)],
    );

    await client.query('COMMIT');
    console.log(`Seeded user=${USER_ID} session=${SESSION_TOKEN} year=${YEAR}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});