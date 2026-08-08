// Server Component: the session check and the ?error= lookup both happen on the
// server, so an already-signed-in visitor is redirected before any HTML ships
// instead of flashing the sign-in form and bouncing client-side.
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Footer from '@/components/Footer';
import Reveal from '@/components/motion/Reveal';
import { auth } from '@/lib/auth';
import { SERVICES } from '@/lib/serviceCatalog';
import SignInForm from './SignInForm';

const oauthErrorMessages: Record<string, string> = {
  OAuthSignin: 'Could not start sign-in with that provider. Please try again.',
  OAuthCallback: 'The provider callback failed. Please try again.',
  OAuthAccountNotLinked: 'That account is already linked to a different sign-in method.',
  AccessDenied: 'Access was denied by the provider.',
};

// Providers a new user can sign in with. Any OAuth service works as an
// identity provider — this isn't limited to a curated "primary" subset.
const signInProviders = SERVICES.filter((s) => s.authType === 'oauth');

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [session, { error }] = await Promise.all([auth(), searchParams]);

  if (session?.user) {
    redirect('/dashboard');
  }

  const errorMessage = error
    ? (oauthErrorMessages[error] ?? 'Something went wrong signing in.')
    : undefined;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground flex flex-col items-center p-6 md:p-10">
      <div
        className="absolute inset-0 bg-gradient-to-br from-transparent via-indigo-950/5 to-purple-950/5 dark:via-indigo-950/10 dark:to-purple-950/5"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center flex-1 w-full max-w-md mt-16 md:mt-24">
        <Reveal variant="down" duration={0.7} className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60">
            Sign in
          </h1>
          <p className="mt-3 text-base text-text-muted font-light">
            Sign in with any service to create your OmniWrap account.
          </p>
        </Reveal>

        <SignInForm providers={signInProviders} initialError={errorMessage} />

        <p className="mt-8 text-sm text-text-subtle text-center">
          Already signed in?{' '}
          <Link href="/dashboard" className="underline hover:text-foreground">
            Go to your dashboard
          </Link>
          .
        </p>
      </div>

      <div className="relative z-10 w-full -mx-6 md:-mx-10 mt-16">
        <Footer />
      </div>
    </div>
  );
}
