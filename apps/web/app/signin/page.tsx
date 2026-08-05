'use client';

import { signIn, useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { SERVICES } from '@/lib/serviceCatalog';

const oauthErrorMessages: Record<string, string> = {
  OAuthSignin: 'Could not start sign-in with that provider. Please try again.',
  OAuthCallback: 'The provider callback failed. Please try again.',
  OAuthAccountNotLinked: 'That account is already linked to a different sign-in method.',
  AccessDenied: 'Access was denied by the provider.',
};

// Providers a new user can sign in with. Any OAuth service works as an
// identity provider — this isn't limited to a curated "primary" subset.
const signInProviders = SERVICES.filter((s) => s.authType === 'oauth');

export default function SignIn() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [status, router]);

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      showToast(oauthErrorMessages[error] || 'Something went wrong signing in.', 'error');
      router.replace('/signin');
    }
  }, [searchParams, router, showToast]);

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const handleSignIn = async (provider: string, label: string) => {
    if (isOffline) {
      showToast("You're offline. Reconnect and try again.", 'error');
      return;
    }
    setPendingProvider(provider);
    try {
      await signIn(provider, { callbackUrl: '/dashboard' });
    } catch {
      showToast(`Could not start sign-in with ${label}. Please try again.`, 'error');
      setPendingProvider(null);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground flex flex-col items-center p-6 md:p-10">
      <div
        className="absolute inset-0 bg-gradient-to-br from-transparent via-indigo-950/5 to-purple-950/5 dark:via-indigo-950/10 dark:to-purple-950/5"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center flex-1 w-full max-w-md mt-16 md:mt-24">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60">
            Sign in
          </h1>
          <p className="mt-3 text-base text-text-muted font-light">
            Sign in with any service to create your OmniWrap account.
          </p>
        </motion.div>

        {isOffline && (
          <div
            role="status"
            className="w-full mb-6 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger text-center"
          >
            You&apos;re offline — sign-in is unavailable until your connection is back.
          </div>
        )}

        <Card className="w-full p-4 md:p-5 flex flex-col gap-3">
          {signInProviders.map((service) => (
            <button
              key={service.provider}
              onClick={() => handleSignIn(service.provider, service.name)}
              disabled={pendingProvider !== null || isOffline}
              style={{ '--accent': service.accent } as React.CSSProperties}
              className="w-full min-h-[44px] flex items-center gap-3 py-3 px-4 rounded-xl border border-border bg-surface-2 hover:bg-surface hover:border-[var(--accent)]/60 font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <img src={service.icon} alt="" aria-hidden="true" className="w-6 h-6" />
              <span>{pendingProvider === service.provider ? `Redirecting to ${service.name}…` : `Continue with ${service.name}`}</span>
            </button>
          ))}
        </Card>

        <p className="mt-8 text-sm text-text-subtle text-center">
          Already signed in? <Link href="/dashboard" className="underline hover:text-foreground">Go to your dashboard</Link>.
        </p>
      </div>

      <div className="relative z-10 w-full -mx-6 md:-mx-10 mt-16">
        <Footer />
      </div>
    </div>
  );
}
