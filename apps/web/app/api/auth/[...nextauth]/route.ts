// apps/web/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import LinkedInProvider from "next-auth/providers/linkedin";
import StravaProvider from "next-auth/providers/strava";
import AppleProvider from "next-auth/providers/apple";

// Custom provider example stub for Telegram (expand with real config)
const TelegramProvider = (options) => {
  return {
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
        id: profile.id,
        name: profile.first_name + " " + profile.last_name,
        email: profile.email,
        image: profile.photo_url,
      };
    },
    ...options,
  };
};

// Custom stubs for Duolingo and Letterboxd (similar structure)
const DuolingoProvider = (options) => ({
  id: "duolingo",
  name: "Duolingo",
  type: "oauth",
  // Fill in real endpoints from Duolingo docs (unofficial)
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
  // Letterboxd API is limited; use custom or manual export fallback
  clientId: process.env.LETTERBOXD_CLIENT_ID,
  clientSecret: process.env.LETTERBOXD_CLIENT_SECRET,
  authorization: "https://api.letterboxd.com/api/v0/auth/token",
  token: "https://api.letterboxd.com/api/v0/auth/token",
  ...options,
});

export const authOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "user-read-email user-top-read user-read-recently-played",
        },
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
        },
      },
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
      authorization: { params: { scope: "r_liteprofile r_emailaddress" } },
    }),
    StravaProvider({
      clientId: process.env.STRAVA_CLIENT_ID!,
      clientSecret: process.env.STRAVA_CLIENT_SECRET!,
    }),
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
      // Apple Music requires additional MusicKit setup
    }),
    // Custom providers
    TelegramProvider({}),
    DuolingoProvider({}),
    LetterboxdProvider({}),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.connections = token.connections || [];
        if (!token.connections.includes(account.provider)) {
          token.connections.push(account.provider);
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.connections = token.connections || [];
      session.user.id = token.sub;
      return session;
    },
  },
  pages: {
    signIn: "/dashboard",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };