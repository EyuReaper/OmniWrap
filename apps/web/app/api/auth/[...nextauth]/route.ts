// apps/web/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import {PrismaAdapter} from "@auth/prisma-adapter";
import SpotifyProvider from "next-auth/providers/spotify";
import GoogleProvider from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import LinkedInProvider from "next-auth/providers/linkedin";
import StravaProvider from "next-auth/providers/strava";
import AppleProvider from "next-auth/providers/apple";
import { encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";


// Custom provider stubs (uncomment when ready to implement)
const TelegramProvider = (options) => ({
  id: "telegram",
  name: "Telegram",
  type: "oauth",
  clientId: env.TELEGRAM_CLIENT_ID,
  clientSecret: env.TELEGRAM_CLIENT_SECRET,
  authorization: { url: "https://oauth.telegram.org/authorize", params: { scope: "" } },
  token: "https://oauth.telegram.org/token",
  userinfo: "https://oauth.telegram.org/userinfo",
  profile(profile) {
    return {
      id: profile.id.toString(),
      name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.username,
      email: profile.email || null,
      image: profile.photo_url || null,
    };
  },
  ...options,
});

const DuolingoProvider = (options) => ({
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

const LetterboxdProvider = (options) => ({
  id: "letterboxd",
  name: "Letterboxd",
  type: "oauth",
  clientId: env.LETTERBOXD_CLIENT_ID,
  clientSecret: env.LETTERBOXD_CLIENT_SECRET,
  authorization: "https://api.letterboxd.com/api/v0/auth/token",
  token: "https://api.letterboxd.com/api/v0/auth/token",
  ...options,
});

const handler = NextAuth({
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
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/dashboard",
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
      }
    },
  },
});

export const { GET, POST } = handler;
export const auth = handler.auth;
