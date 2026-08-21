// Server Component: the session and every service's connection status are
// resolved on the server, so the authenticated dashboard paints real data on
// first render instead of hydrating and then fetching /api/connections.
import Link from 'next/link';
import Footer from '@/components/Footer';
import Reveal from '@/components/motion/Reveal';
import { Button } from '@/components/ui/Button';
import { auth } from '@/lib/auth';
import { getConnectionStatuses } from '@/lib/connections';
import { getWrapYear } from '@/lib/wrapYear';
import DashboardClient from './DashboardClient';

const oauthErrorMessages: Record<string, string> = {
  OAuthSignin: 'Could not start sign-in with that provider. Please try again.',
  OAuthCallback: 'The provider callback failed. Please try connecting again.',
  OAuthAccountNotLinked: 'That account is already linked to a different sign-in method.',
  AccessDenied: 'Access was denied by the provider.',
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [session, { error }] = await Promise.all([auth(), searchParams]);

  // Logged-out visitors get a distinct, minimal state — no service grid, just a way in.
  if (!session?.user?.id) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
        <div
          className="absolute inset-0 bg-gradient-to-br from-transparent via-indigo-950/5 to-purple-950/5 dark:via-indigo-950/10 dark:to-purple-950/5"
          aria-hidden="true"
        />
        <Reveal variant="up" duration={0.7} className="relative z-10 max-w-md">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60 mb-4">
            OmniWrap
          </h1>
          <p className="text-base md:text-lg text-text-muted font-light mb-10">
            Sign in to connect your services and build your year in review.
          </p>
          <Link href="/signin">
            <Button size="lg" className="!rounded-full">
              Sign in to get started
            </Button>
          </Link>
        </Reveal>
        <div className="relative z-10 w-full -mx-6 md:mx-0 mt-16">
          <Footer />
        </div>
      </div>
    );
  }

  const connections = await getConnectionStatuses(session.user.id);

  return (
    <DashboardClient
      userName={session.user.name}
      year={getWrapYear()}
      initialConnections={connections}
      initialError={error ? (oauthErrorMessages[error] ?? 'Something went wrong connecting that service.') : undefined}
    />
  );
}
