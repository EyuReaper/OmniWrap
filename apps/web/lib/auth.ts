// NextAuth configuration.
//
// This lives in `lib/` rather than in the route file so that Server Components
// can `import { auth } from '@/lib/auth'` without pulling in a route module.
// The route at app/api/auth/[...nextauth]/route.ts only re-exports `handlers`.
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import SpotifyProvider from "next-auth/providers/spotify";
import GoogleProvider from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import LinkedInProvider from "next-auth/providers/linkedin";
import StravaProvider from "next-auth/providers/strava";
import { encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { logAudit } from "@/lib/auditLog";

/** Extra options merged into a provider stub by the caller. */
type ProviderStubOptions = Record<string, unknown>;

interface TelegramProfile {
  id: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string | null;
  photo_url?: string | null;
}

// Custom provider stubs — none of these are wired into `providers` below,
// because the upstream APIs either don't exist or aren't implemented yet.
// Telegram and Duolingo are handled as manual connections instead
// (see app/api/connections/manual/route.ts).
export const TelegramProvider = (options: ProviderStubOptions) => ({
  id: "telegram",
  name: "Telegram",
  type: "oauth",
  clientId: env.TELEGRAM_CLIENT_ID,
  clientSecret: env.TELEGRAM_CLIENT_SECRET,
  authorization: { url: "https://oauth.telegram.org/authorize", params: { scope: "" } },
  token: "https://oauth.telegram.org/token",
  userinfo: "https://oauth.telegram.org/userinfo",
  profile(profile: TelegramProfile) {
    return {
      id: profile.id.toString(),
      name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.username,
      email: profile.email || null,
      image: profile.photo_url || null,
    };
  },
  ...options,
});

export const DuolingoProvider = (options: ProviderStubOptions) => ({
  id: "duolingo",
  name: "Duolingo",
  type: "oauth",
  clientId: env.DUOLINGO_CLIENT_ID,
  clientSecret: env.DUOLINGO_CLIENT_SECRET,
  authorization: "https://www.duolingo.com/oauth2/authorize",
  token: "https://www.duolingo.com/oauth2/token",
  userinfo: "https://www.duolingo.com/2017-06-30/users/show",
  ...options,
});

export const LetterboxdProvider = (options: ProviderStubOptions) => ({
  id: "letterboxd",
  name: "Letterboxd",
  type: "oauth",
  clientId: env.LETTERBOXD_CLIENT_ID,
  clientSecret: env.LETTERBOXD_CLIENT_SECRET,
  authorization: "https://api.letterboxd.com/api/v0/auth/token",
  token: "https://api.letterboxd.com/api/v0/auth/token",
  ...options,
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    SpotifyProvider({
      clientId: env.SPOTIFY_CLIENT_ID,
      clientSecret: env.SPOTIFY_CLIENT_SECRET,
    }),
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
        },
      },
    }),
    GitHub({
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    }),
    StravaProvider({
      clientId: env.STRAVA_CLIENT_ID,
      clientSecret: env.STRAVA_CLIENT_SECRET,
    }),
    LinkedInProvider({
      clientId: env.LINKEDIN_CLIENT_ID,
      clientSecret: env.LINKEDIN_CLIENT_SECRET,
      authorization: { params: { scope: "openid profile email" } },
    }),
  ],
  secret: env.NEXTAUTH_SECRET,
  session: { strategy: "database" },
  callbacks: {
    async session({ session, user }) {
      // Deliberately kept free of extra queries: `auth()` now runs on every
      // Server Component render, so anything added here costs a DB round trip
      // per page view. Connection state comes from getConnectionStatuses().
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/signin",
    error: "/auth/error",
  },
  debug: env.NODE_ENV === "development",
  events: {
    async signIn({ user, account }) {
      if (account && user.id) {
        console.log(`[NextAuth] Syncing ${account.provider} connection for user: ${user.id}`);
        const encryptedAccessToken = account.access_token ? encrypt(account.access_token) : null;
        const encryptedRefreshToken = account.refresh_token ? encrypt(account.refresh_token) : null;

        await prisma.connection.upsert({
          where: {
            userId_provider: {
              userId: user.id,
              provider: account.provider,
            },
          },
          update: {
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
          },
          create: {
            userId: user.id,
            provider: account.provider,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
          },
        });

        await logAudit(user.id, "connection.connect", {
          userEmail: user.email,
          metadata: { provider: account.provider },
        });
      }
    },
  },
});
