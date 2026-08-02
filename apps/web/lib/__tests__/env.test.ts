import { describe, it, expect } from 'vitest';
import { envSchema } from '../env';

describe('Environment Schema (Zod)', () => {
  const validEnv = {
    DATABASE_URL: 'postgresql://postgres:password@localhost:5432/omniwrap',
    NEXTAUTH_SECRET: 'a_very_secret_key',
    ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', // 64 hex chars
    SPOTIFY_CLIENT_ID: 'spotify_id',
    SPOTIFY_CLIENT_SECRET: 'spotify_secret',
    GITHUB_CLIENT_ID: 'github_id',
    GITHUB_CLIENT_SECRET: 'github_secret',
    GOOGLE_CLIENT_ID: 'google_id',
    GOOGLE_CLIENT_SECRET: 'google_secret',
    STRAVA_CLIENT_ID: 'strava_id',
    STRAVA_CLIENT_SECRET: 'strava_secret',
    LINKEDIN_CLIENT_ID: 'linkedin_id',
    LINKEDIN_CLIENT_SECRET: 'linkedin_secret',
    NODE_ENV: 'test',
  };

  it('should parse valid environment variables successfully', () => {
    const result = envSchema.safeParse(validEnv);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.DATABASE_URL).toBe(validEnv.DATABASE_URL);
      expect(result.data.ENCRYPTION_KEY).toBe(validEnv.ENCRYPTION_KEY);
    }
  });

  it('should fail when DATABASE_URL is not a valid URL', () => {
    const invalidEnv = { ...validEnv, DATABASE_URL: 'not-a-url' };
    const result = envSchema.safeParse(invalidEnv);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.DATABASE_URL).toBeDefined();
    }
  });

  it('should fail when ENCRYPTION_KEY is not exactly 64 characters long', () => {
    const invalidEnvShort = { ...validEnv, ENCRYPTION_KEY: 'too_short' };
    const resultShort = envSchema.safeParse(invalidEnvShort);
    expect(resultShort.success).toBe(false);

    const invalidEnvLong = { ...validEnv, ENCRYPTION_KEY: 'a'.repeat(65) };
    const resultLong = envSchema.safeParse(invalidEnvLong);
    expect(resultLong.success).toBe(false);
  });

  it('should fail when required OAuth client IDs or secrets are missing or empty', () => {
    const missingSpotify = { ...validEnv, SPOTIFY_CLIENT_ID: '' };
    const result = envSchema.safeParse(missingSpotify);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.SPOTIFY_CLIENT_ID).toBeDefined();
    }
  });

  it('should allow optional stubs like TELEGRAM_CLIENT_ID to be omitted', () => {
    // validEnv intentionally omits optional TELEGRAM_*/DUOLINGO_*/LETTERBOXD_* keys
    const result = envSchema.safeParse(validEnv);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.TELEGRAM_CLIENT_ID).toBeUndefined();
    }
  });
});
