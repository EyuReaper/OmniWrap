// Provide default environment variables so imports of lib/env.ts succeed during tests
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/omniwrap_test';
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test_secret_123456789';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || 'spotify_client_id';
process.env.SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || 'spotify_client_secret';
process.env.GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'github_client_id';
process.env.GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || 'github_client_secret';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'google_client_id';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'google_client_secret';
process.env.STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID || 'strava_client_id';
process.env.STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET || 'strava_client_secret';
process.env.LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || 'linkedin_client_id';
process.env.LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || 'linkedin_client_secret';
// Vitest sets NODE_ENV=test; avoid reassignment (read-only in @types/node).
if (!process.env.NODE_ENV) {
  Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
}
