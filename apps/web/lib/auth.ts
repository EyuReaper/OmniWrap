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
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { logAudit } from "@/lib/auditLog";
import { syncConnectionFromAccount } from "@/lib/syncConnection";
import type { Provider } from "next-auth/providers/index";

// Telegram/Duolingo/Letterboxd have no real data integration yet (see
// serviceCatalog) — they are marked "Coming soon" in the dashboard and are NOT
// wired into `providers` below. No OAuth provider stubs are defined for them;
// once a real API exists, add the provider here and the service in lib/services.

// data fetcher yet, so deployments that don't use it shouldn't need the vars.
const oauthProviders: Provider[] = [
  SpotifyProvider({
    clientId: env.SPOTIFY_CLIENT_ID,
    clientSecret: env.SPOTIFY_CLIENT_SECRET,
    authorization: {
      params: { scope: "user-top-read user-read-recently-played user-read-email user-read-private" },
    },
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
    authorization: { params: { scope: "read,activity:read" } },
  }),
];

if (env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET) {
  oauthProviders.push(
    LinkedInProvider({
      clientId: env.LINKEDIN_CLIENT_ID,
      clientSecret: env.LINKEDIN_CLIENT_SECRET,
      authorization: { params: { scope: "openid profile email" } },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: oauthProviders,
  secret: env.NEXTAUTH_SECRET,
  // NextAuth v5 refuses to trust the Host header in production by default,
  // which breaks `auth()` inside proxy.ts (Next 16 middleware) and the API
  // session endpoints on Vercel/serverless hosts. This app is always served
  // behind a known host, so trust it.
  trustHost: true,
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
        await syncConnectionFromAccount(user.id, account);
        await logAudit(user.id, "connection.connect", {
          userEmail: user.email,
          metadata: { provider: account.provider },
        });
      }
    },
  },
});
