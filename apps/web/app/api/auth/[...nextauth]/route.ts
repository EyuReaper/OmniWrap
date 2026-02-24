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


// Custom provider stubs (uncomment when ready to implement)
const TelegramProvider = (options) => ({
  id: "telegram",
  name: "Telegram",
  type: "oauth",
  clientId: process.env.TELEGRAM_CLIENT_ID,
  clientSecret: process.env.TELEGRAM_CLIENT_SECRET,
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
  clientId: process.env.DUOLINGO_CLIENT_ID,
  clientSecret: process.env.DUOLINGO_CLIENT_SECRET,
  authorization: "https://www.duolingo.com/oauth2/authorize",
  token: "https://www.duolingo.com/oauth2/token",
  userinfo: "https://www.duolingo.com/2017-06-30/users/show",
  ...options,
});

const LetterboxdProvider = (options) => ({
  id: "letterboxd",
  name: "Letterboxd",
  type: "oauth",
  clientId: process.env.LETTERBOXD_CLIENT_ID,
  clientSecret: process.env.LETTERBOXD_CLIENT_SECRET,
  authorization: "https://api.letterboxd.com/api/v0/auth/token",
  token: "https://api.letterboxd.com/api/v0/auth/token",
  ...options,
});

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    // SpotifyProvider({
    //   clientId: process.env.SPOTIFY_CLIENT_ID || '',
    //   clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
    //   authorization: {
    //     params: {
    //       scope: "user-read-email user-top-read user-read-recently-played",
    //     },
    //   },
    // }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
        },
      },
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    }),
    StravaProvider({
      clientId: process.env.STRAVA_CLIENT_ID || '',
      clientSecret: process.env.STRAVA_CLIENT_SECRET || '',
    }),
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
      authorization: { params: { scope: "openid profile email" } },
    }),
    // AppleProvider({
    // Uncomment when ready (custom providers)
    // TelegramProvider({}),
    // DuolingoProvider({}),
    // LetterboxdProvider({}),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "database" },
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  pages: {
    signIn: "/dashboard",
    error: "/auth/error",  // Points to your custom error page
  },
  debug: process.env.NODE_ENV === "development", // Detailed logs in dev
  events: {
    async signIn({ user, account }) {
      if (account && user.id) {
        console.log(`[NextAuth] Syncing ${account.provider} connection for user: ${user.id}`);
        
        // Encrypt tokens before saving
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
    async signOut({ token }) {
      console.log("[NextAuth] SignOut:", { userId: token?.sub });
    },
  },
});

export const { GET, POST } = handlers;
