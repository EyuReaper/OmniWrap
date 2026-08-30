'use client';

import { signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Footer from '@/components/Footer';
import AccountMenu from '@/components/AccountMenu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { SERVICES, CONNECTABLE_SERVICES, ServiceDef, ConnectionInfo, ConnectionStatus } from '@/lib/serviceCatalog';

const statusBadge: Record<ConnectionStatus, { label: string; className: string } | null> = {
  connected: { label: 'Connected', className: 'bg-green-600/70 border-green-400/30' },
  pending: { label: 'Pending', className: 'bg-blue-600/70 border-blue-400/30' },
  expired: { label: 'Expired', className: 'bg-amber-600/70 border-amber-400/30' },
  error: { label: 'Error', className: 'bg-red-600/70 border-red-400/30' },
  never: null,
};

function toMap(list: ConnectionInfo[]): Record<string, ConnectionInfo> {
  const map: Record<string, ConnectionInfo> = {};
  for (const c of list) {
    // Providers the user has never connected are omitted so the "never"
    // default in the render path stays the single source of truth.
    if (c.status !== 'never') map[c.provider] = c;
  }
  return map;
}

/**
 * Interactive half of the dashboard. Connection state arrives already resolved
 * from the Server Component, so the first paint is real data rather than a
 * skeleton followed by a fetch.
 */
export default function DashboardClient({
  userName,
  year,
  initialConnections,
  initialError,
}: {
  userName?: string | null;
  year: number;
  initialConnections: ConnectionInfo[];
  initialError?: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [connections, setConnections] = useState<Record<string, ConnectionInfo>>(() =>
    toMap(initialConnections),
  );
  const [disconnectTarget, setDisconnectTarget] = useState<ServiceDef | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  // The server read ?error= off the URL; surface it once, then clean the URL.
  useEffect(() => {
    if (!initialError) return;
    showToast(initialError, 'error');
    router.replace('/dashboard');
  }, [initialError, router, showToast]);

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => {
      setIsOffline(true);
      showToast("You're offline. Some actions won't work until you reconnect.", 'error');
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [showToast]);

  const handleConnect = async (service: ServiceDef) => {
    if (isOffline) {
      showToast("You're offline. Reconnect and try again.", 'error');
      return;
    }

    showToast(`Redirecting to ${service.name} sign-in…`, 'info');
    try {
      await signIn(service.provider, { callbackUrl: '/dashboard' });
    } catch {
      showToast(`Could not connect ${service.name}. Please try again.`, 'error');
    }
  };

  const confirmDisconnect = async () => {
    if (!disconnectTarget) return;
    setDisconnecting(true);
    try {
      const res = await fetch(`/api/connections/${disconnectTarget.provider}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setConnections((prev) => {
        const next = { ...prev };
        delete next[disconnectTarget.provider];
        return next;
      });
      showToast(`Disconnected ${disconnectTarget.name}.`, 'success');
    } catch {
      showToast(
        isOffline
          ? `You're offline — couldn't disconnect ${disconnectTarget.name}.`
          : `Could not disconnect ${disconnectTarget.name}. Please try again.`,
        'error',
      );
    } finally {
      setDisconnecting(false);
      setDisconnectTarget(null);
    }
  };

  const connectedCount = Object.values(connections).filter((c) => c.status === 'connected').length;
  const totalCount = CONNECTABLE_SERVICES.length;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground flex flex-col items-center p-6 md:p-10">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-indigo-950/5 to-purple-950/5 dark:via-indigo-950/10 dark:to-purple-950/5" aria-hidden="true" />

      <div className="absolute top-6 right-6 md:top-8 md:right-8 z-30">
        <AccountMenu />
      </div>

      <div className="relative z-10 flex flex-col items-center flex-1 w-full">
        {isOffline && (
          <div
            role="status"
            className="w-full max-w-7xl mb-6 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger text-center"
          >
            You&apos;re offline — connecting or disconnecting services is unavailable until you&apos;re back online.
          </div>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-10 md:mb-16 mt-6 md:mt-10"
        >
          <h1 className="text-5xl md:text-6xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60">
            {userName ? `Hey ${userName.split(' ')[0]}!` : 'OmniWrap'}
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-3 text-base md:text-lg text-text-muted font-light flex flex-col items-center gap-2"
          >
            <span>Connect your {year} digital world</span>
            <button 
              onClick={() => setShowWhatsNew(true)}
              className="text-sm text-primary hover:text-primary/80 transition-colors underline"
              aria-label={`See what's new in ${year}`}
            >
              See what&apos;s new
            </button>
          </motion.p>
        </motion.div>

        {/* What's New Dialog */}
        <AnimatePresence>
          {showWhatsNew && (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowWhatsNew(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 md:p-8 shadow-2xl relative max-h-[85vh] overflow-y-auto text-left"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-2xl font-bold text-foreground mb-4">What&apos;s new in {year}? 🎉</h2>
                <div className="text-sm text-text-muted space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-bold text-foreground">Multi-year Wraps</h3>
                    <p>You can now browse wraps from past years! Just select a year in the top corner of your wrap view.</p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-foreground">Strava & More Data</h3>
                    <p>We&apos;ve added deeper Strava integration so you can see all your activities. We&apos;re also working on Duolingo and Telegram!</p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-foreground">Improved Sharing & Privacy</h3>
                    <p>New vertical and square export formats for Instagram and Twitter. Plus, absolute control over your connected data with single-click revokes.</p>
                  </div>
                </div>
                <div className="mt-8 flex justify-end">
                  <button
                    onClick={() => setShowWhatsNew(false)}
                    className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl transition-colors"
                  >
                    Awesome
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Logged-in, zero-connections nudge / Onboarding Checklist */}
        {connectedCount === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="w-full max-w-2xl mb-12 rounded-2xl border border-border bg-surface/40 backdrop-blur-xl p-6 md:p-8"
          >
            <h3 className="text-xl font-bold text-foreground mb-4">Welcome to OmniWrap! 🚀</h3>
            <p className="text-sm text-text-muted mb-6">Follow these steps to build your personal year-in-review:</p>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">1</div>
                <div>
                  <p className="font-medium text-foreground">Connect a service</p>
                  <p className="text-sm text-text-muted">Link at least one service below (like Spotify or GitHub) to gather your stats.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-surface-2 text-text-muted flex items-center justify-center font-bold">2</div>
                <div>
                  <p className="font-medium text-foreground">Connect more (Optional)</p>
                  <p className="text-sm text-text-muted">The more you connect, the richer your wrap becomes.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-surface-2 text-text-muted flex items-center justify-center font-bold">3</div>
                <div>
                  <p className="font-medium text-foreground">Generate Your Wrap</p>
                  <p className="text-sm text-text-muted">Click the big &quot;Generate Your Wrap&quot; button at the bottom when you&apos;re ready.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Service Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 w-full max-w-7xl">
          {SERVICES.map((service, index) => {
            if (service.authType === 'comingSoon') {
              return (
                <motion.div
                  key={service.provider}
                  initial={{ opacity: 0, y: 50, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.9, delay: index * 0.08 + 0.3 }}
                  className={`group relative overflow-hidden rounded-2xl p-6 md:p-7 backdrop-blur-xl bg-gradient-to-br ${service.color} border border-white/10 ${service.glow} transition-all duration-500 opacity-80`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/30 opacity-50 transition-opacity duration-700" />

                  <div className="absolute top-4 right-4 px-3 py-1 bg-black/50 backdrop-blur-md border border-white/20 text-gray-300 text-xs font-bold rounded-full">
                    Coming soon
                  </div>

                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="mb-5 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={service.icon}
                        alt=""
                        aria-hidden="true"
                        className="w-14 h-14 md:w-16 md:h-16 drop-shadow-[0_0_12px_white] animate-pulse-slow"
                      />
                    </div>

                    <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-3">
                      {service.name}
                    </h2>

                    <p className="text-sm md:text-base text-gray-300 mb-6 opacity-90">
                      More exciting services on the way...
                    </p>

                    <div
                      aria-disabled="true"
                      className="w-full py-3 px-5 min-h-[44px] bg-black/40 backdrop-blur-md border border-white/20 text-gray-400 font-semibold rounded-xl text-sm cursor-not-allowed opacity-70"
                    >
                      Unlocking Soon
                    </div>
                  </div>
                </motion.div>
              );
            }

            const info = connections[service.provider];
            const connStatus: ConnectionStatus = info?.status ?? 'never';
            const badge = statusBadge[connStatus];
            const hasRow = connStatus !== 'never';

            const primaryLabel =
              connStatus === 'never'
                ? `Connect ${service.name}`
                : connStatus === 'pending'
                  ? 'View link code'
                  : connStatus === 'connected'
                    ? service.authType === 'manual'
                      ? 'Update'
                      : 'Manage'
                    : 'Reconnect';

            return (
              <motion.div
                key={service.provider}
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.9,
                  delay: index * 0.08 + 0.3,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
                whileHover={{ scale: 1.04, y: -6 }}
                className={`group relative overflow-hidden rounded-2xl p-6 md:p-7 backdrop-blur-xl bg-gradient-to-br ${service.color} border border-white/10 ${service.glow} transition-all duration-500`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/30 opacity-50 group-hover:opacity-30 transition-opacity duration-700" />

                <div className="relative z-10 flex flex-col items-center">
                  {badge && (
                    <div
                      className={`absolute top-4 right-4 flex items-center gap-1 px-3 py-1 backdrop-blur-md border text-white text-xs font-bold rounded-full shadow-md ${badge.className}`}
                    >
                      <span>{badge.label}</span>
                    </div>
                  )}

                  <div className="mb-5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={service.icon}
                      alt={`${service.name} icon`}
                      className="w-14 h-14 md:w-16 md:h-16 drop-shadow-[0_0_12px_currentColor] transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 group-hover:drop-shadow-[0_0_20px_currentColor] group-hover:brightness-125"
                    />
                  </div>

                  <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-3 drop-shadow-md">
                    {service.name}
                  </h2>

                  <p className="text-sm md:text-base text-gray-300 mb-6 opacity-90 font-light">
                    {connStatus === 'expired' || connStatus === 'error'
                      ? (info?.lastError ?? 'Reconnect to keep this in your wrap.')
                      : `Unlock your ${service.name.toLowerCase()} highlights`}
                  </p>

                  <div className="w-full flex flex-col gap-2">
                    <button
                      onClick={() => handleConnect(service)}
                      disabled={isOffline}
                      style={{ '--accent': service.accent } as React.CSSProperties}
                      className="w-full min-h-[44px] py-3 px-5 bg-black/40 backdrop-blur-md border border-white/20 text-white font-semibold rounded-xl text-sm hover:bg-black/60 hover:border-[var(--accent)]/60 hover:text-[var(--accent)] transition-all duration-400 shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {primaryLabel}
                    </button>

                    {hasRow && (
                      <button
                        onClick={() => setDisconnectTarget(service)}
                        disabled={isOffline}
                        className="w-full min-h-[44px] py-2 px-5 text-gray-300 hover:text-danger text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <ConfirmDialog
          open={disconnectTarget !== null}
          title={`Disconnect ${disconnectTarget?.name ?? ''}?`}
          description={
            <div className="flex flex-col gap-3">
              <p>This removes stored access to {disconnectTarget?.name ?? 'this service'} and its data won&apos;t appear in future wraps until you reconnect.</p>
              {disconnectTarget?.revokeUrl && (
                <p className="text-xs opacity-80">
                  Note: To fully revoke access, you should also visit the{' '}
                  <a
                    href={disconnectTarget.revokeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-white transition-colors"
                  >
                    {disconnectTarget.name} app permissions page
                  </a>.
                </p>
              )}
            </div>
          }
          confirmLabel="Disconnect"
          variant="danger"
          isBusy={disconnecting}
          onConfirm={confirmDisconnect}
          onCancel={() => setDisconnectTarget(null)}
        />

        {/* Progress + CTA */}
        <div className="mt-16 md:mt-20 flex flex-col items-center gap-4">
          <p className="text-sm md:text-base text-text-muted font-medium flex flex-col sm:flex-row items-center gap-2">
            <span>{connectedCount} of {totalCount} services connected</span>
            <button
              onClick={() => setShowPrivacyInfo(true)}
              className="text-xs underline hover:text-white transition-colors opacity-80"
              aria-label="Learn what data is fetched and retained"
            >
              (What data do we fetch?)
            </button>
          </p>
          <Link href="/wrap" className="relative z-20">
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6, ease: 'backOut' }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.96 }}
              className="relative px-12 py-5 min-h-[44px] text-xl md:text-2xl font-black text-white rounded-2xl overflow-hidden bg-gradient-to-r from-[#1DB954] via-[#9333EA] to-[#FF0000] shadow-[0_0_50px_rgba(29,185,84,0.4)] group disabled:opacity-60"
            >
              <span className="relative z-10">Generate Your {year} Wrap</span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#1DB954]/30 via-[#9333EA]/30 to-[#FF0000]/30 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl" />
            </motion.button>
          </Link>
        </div>

        {/* Privacy Info Dialog */}
        <AnimatePresence>
          {showPrivacyInfo && (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowPrivacyInfo(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 md:p-8 shadow-2xl relative max-h-[85vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-2xl font-bold text-foreground mb-4">Your Data & Privacy</h2>
                <div className="text-sm text-text-muted space-y-4">
                  <p>
                    OmniWrap requests only the minimum read access required to generate your wrap. 
                    We do <strong>not</strong> request write access, private messages, or friend lists.
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Spotify:</strong> Top tracks/artists, recently played.</li>
                    <li><strong>YouTube:</strong> Liked videos, channel stats.</li>
                    <li><strong>GitHub:</strong> Public repositories, commit activity.</li>
                    <li><strong>Strava:</strong> Activity summaries for the year.</li>
                  </ul>
                  <p>
                    Tokens are <strong>encrypted</strong> in our database and used exclusively to fetch your statistics. 
                    If you disconnect a service, its token is permanently deleted. If you delete your account, 
                    all your wraps and connections are wiped.
                  </p>
                  <p>
                    You can revoke OmniWrap&apos;s access entirely via each service&apos;s third-party app permissions page at any time.
                  </p>
                </div>
                <div className="mt-8 flex justify-end">
                  <button
                    onClick={() => setShowPrivacyInfo(false)}
                    className="px-6 py-2 bg-surface-2 hover:bg-surface-3 text-white font-medium rounded-xl transition-colors border border-border"
                  >
                    Got it
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative z-10 w-full -mx-6 md:-mx-10 mt-16">
        <Footer />
      </div>
    </div>
  );
}
