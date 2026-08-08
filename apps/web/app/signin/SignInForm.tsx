'use client';

import { signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { ServiceDef } from '@/lib/serviceCatalog';

export default function SignInForm({
  providers,
  initialError,
}: {
  providers: ServiceDef[];
  initialError?: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);

  // The server read ?error= off the URL; surface it once, then clean the URL.
  useEffect(() => {
    if (!initialError) return;
    showToast(initialError, 'error');
    router.replace('/signin');
  }, [initialError, router, showToast]);

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
    <>
      {isOffline && (
        <div
          role="status"
          className="w-full mb-6 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger text-center"
        >
          You&apos;re offline — sign-in is unavailable until your connection is back.
        </div>
      )}

      <Card className="w-full p-4 md:p-5 flex flex-col gap-3">
        {providers.map((service) => (
          <button
            key={service.provider}
            onClick={() => handleSignIn(service.provider, service.name)}
            disabled={pendingProvider !== null || isOffline}
            style={{ '--accent': service.accent } as React.CSSProperties}
            className="w-full min-h-[44px] flex items-center gap-3 py-3 px-4 rounded-xl border border-border bg-surface-2 hover:bg-surface hover:border-[var(--accent)]/60 font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={service.icon} alt="" aria-hidden="true" className="w-6 h-6" />
            <span>
              {pendingProvider === service.provider
                ? `Redirecting to ${service.name}…`
                : `Continue with ${service.name}`}
            </span>
          </button>
        ))}
      </Card>
    </>
  );
}
