import { z } from "zod";

const envSchema = z.object({
  //infrastructure
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),
  ENCRYPTION_KEY: z.string().length(64), //must be 32-byte hex (64 chars)

  //Spotify
  SPOTIFY_CLIENT_ID: z.string().min(1),
  SPOTIFY_CLIENT_SECRET: z.string().min(1),

  //GitHub
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),

  //google/Youtube
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  //Strava
  STRAVA_CLIENT_ID: z.string().min(1),
  STRAVA_CLIENT_SECRET: z.string().min(1),

  //LinkedIn
  LINKEDIN_CLIENT_ID: z.string().min(1),
  LINKEDIN_CLIENT_SECRET: z.string().min(1),

  //Future Stubs (Optional)
  TELEGRAM_CLIENT_ID: z.string().optional(),
  TELEGRAM_CLIENT_SECRET: z.string().optional(),
  DUOLINGO_CLIENT_ID: z.string().optional(),
  DUOLINGO_CLIENT_SECRET: z.string().optional(),
  LETTERBOXD_CLIENT_ID: z.string().optional(),
  LETTERBOXD_CLIENT_SECRET: z.string().optional(),

  //app
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

// Validate process.env & export the result
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
