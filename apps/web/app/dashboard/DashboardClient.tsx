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
  initialConnections,
  initialError,
}: {
  userName?: string | null;
  initialConnections: ConnectionInfo[];
  initialError?: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [connections, setConnections] = useState<Record<string, ConnectionInfo>>(() =>
    toMap(initialConnections),
  );
  const [activeManualService, setActiveManualService] = useState<string | null>(null);
  const [duoUsername, setDuoUsername] = useState('');
  const [duoSubmitting, setDuoSubmitting] = useState(false);
  const [duoError, setDuoError] = useState<string | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<ServiceDef | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);

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

  const refreshConnections = async () => {
    try {
      const res = await fetch('/api/connections');
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { connections: ConnectionInfo[] };
      const map = toMap(data.connections);
      setConnections(map);
      return map;
    } catch {
      showToast('Could not load your connection status.', 'error');
      return null;
    }
  };

  // While the Telegram modal is open on a pending link, poll for the bot-side confirmation.
  useEffect(() => {
    if (activeManualService !== 'telegram' || connections.telegram?.status !== 'pending') return;
    const interval = setInterval(async () => {
      const map = await refreshConnections();
      if (map?.telegram?.status === 'connected') {
        setActiveManualService(null);
        showToast('Telegram connected!', 'success');
      }
    }, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeManualService, connections.telegram?.status]);

  const handleConnect = async (service: ServiceDef) => {
    if (isOffline) {
      showToast("You're offline. Reconnect and try again.", 'error');
      return;
    }

    if (service.authType === 'manual') {
      setActiveManualService(service.provider);
      setDuoError(null);
      if (service.provider === 'duolingo') {
        setDuoUsername((connections.duolingo?.metadata?.username as string) || '');
      }
      if (service.provider === 'telegram' && connections.telegram?.status !== 'pending') {
        try {
          const res = await fetch('/api/connections/manual', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'telegram' }),
          });
          if (!res.ok) throw new Error();
          const data = await res.json();
          setConnections((prev) => ({
            ...prev,
            telegram: { provider: 'telegram', status: 'pending', metadata: { linkCode: data.linkCode } },
          }));
        } catch {
          showToast('Could not start Telegram linking. Please try again.', 'error');
          setActiveManualService(null);
        }
      }
      return;
    }

    showToast(`Redirecting to ${service.name} sign-in…`, 'info');
    try {
      await signIn(service.provider, { callbackUrl: '/dashboard' });
    } catch {
      showToast(`Could not connect ${service.name}. Please try again.`, 'error');
    }
  };

  const handleDuolingoSubmit = async () => {
    const trimmed = duoUsername.trim();
    if (!trimmed) return;
    if (isOffline) {
      setDuoError("You're offline. Reconnect and try again.");
      return;
    }
    setDuoSubmitting(true);
    setDuoError(null);
    try {
      const res = await fetch('/api/connections/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'duolingo', username: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDuoError(data.error || 'Could not verify that username.');
        return;
      }
      setConnections((prev) => ({
        ...prev,
        duolingo: { provider: 'duolingo', status: 'connected', metadata: data.metadata },
      }));
      setActiveManualService(null);
      showToast('Duolingo connected!', 'success');
    } catch {
      setDuoError('Network error — check your connection and try again.');
    } finally {
      setDuoSubmitting(false);
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
            className="mt-3 text-base md:text-lg text-text-muted font-light"
          >
            Connect your 2025 digital world
          </motion.p>
        </motion.div>

        {/* Logged-in, zero-connections nudge */}
        {connectedCount === 0 && (
          <div className="w-full max-w-7xl mb-8 rounded-xl border border-border bg-surface-2/60 px-5 py-4 text-center text-sm text-text-muted">
            Connect your first service below to start building your wrap.
          </div>
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

        {/* Manual Connection Modal */}
        <AnimatePresence>
          {activeManualService && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="manual-connect-title"
              className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md p-8 bg-gray-900 border border-white/10 rounded-3xl shadow-2xl"
              >
                <button
                  onClick={() => setActiveManualService(null)}
                  aria-label="Close dialog"
                  className="absolute top-2 right-2 w-11 h-11 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="text-center">
                  <h2 id="manual-connect-title" className="text-3xl font-black text-white mb-4">
                    Connect {activeManualService.charAt(0).toUpperCase() + activeManualService.slice(1)}
                  </h2>

                  {activeManualService === 'telegram' ? (
                    <div className="space-y-6">
                      <p className="text-gray-400 leading-relaxed">
                        To sync your social stats, send your unique code to our bot on Telegram.
                      </p>
                      <div className="p-4 bg-black/40 rounded-2xl border border-blue-500/30">
                        <p className="text-xs text-blue-400 font-mono mb-2">TELEGRAM COMMAND</p>
                        <code className="text-xl font-black text-white">
                          /link {(connections.telegram?.metadata?.linkCode as string) || '…'}
                        </code>
                      </div>
                      <Link
                        href="https://t.me/OmniWrapBot"
                        target="_blank"
                        className="block w-full min-h-[44px] py-4 bg-[#0088CC] text-white font-bold rounded-2xl hover:bg-[#0077B5] transition-colors"
                      >
                        Open @OmniWrapBot
                      </Link>
                      <p className="text-xs text-gray-500" role="status">
                        Waiting for confirmation from Telegram…
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <p className="text-gray-400 leading-relaxed">
                        Enter your Duolingo username to sync your learning streaks.
                      </p>
                      <label htmlFor="duolingo-username" className="sr-only">
                        Duolingo username
                      </label>
                      <input
                        id="duolingo-username"
                        type="text"
                        placeholder="@username"
                        value={duoUsername}
                        onChange={(e) => setDuoUsername(e.target.value)}
                        aria-invalid={Boolean(duoError)}
                        aria-describedby={duoError ? 'duolingo-error' : undefined}
                        className="w-full p-4 min-h-[44px] bg-black/40 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-[#58CC02]/50"
                      />
                      {duoError && (
                        <p id="duolingo-error" role="alert" className="text-sm text-danger -mt-3">
                          {duoError}
                        </p>
                      )}
                      <button
                        onClick={handleDuolingoSubmit}
                        disabled={!duoUsername.trim() || duoSubmitting || isOffline}
                        className="w-full min-h-[44px] py-4 bg-[#58CC02] text-white font-bold rounded-2xl hover:bg-[#4CAF00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {duoSubmitting ? 'Verifying…' : 'Save Username'}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <ConfirmDialog
          open={disconnectTarget !== null}
          title={`Disconnect ${disconnectTarget?.name ?? ''}?`}
          description={`This removes stored access to ${disconnectTarget?.name ?? 'this service'} and its data won't appear in future wraps until you reconnect.`}
          confirmLabel="Disconnect"
          variant="danger"
          isBusy={disconnecting}
          onConfirm={confirmDisconnect}
          onCancel={() => setDisconnectTarget(null)}
        />

        {/* Progress + CTA */}
        <div className="mt-16 md:mt-20 flex flex-col items-center gap-4">
          <p className="text-sm md:text-base text-text-muted font-medium">
            {connectedCount} of {totalCount} services connected
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
              <span className="relative z-10">Generate Your 2025 Wrap</span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#1DB954]/30 via-[#9333EA]/30 to-[#FF0000]/30 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl" />
            </motion.button>
          </Link>
        </div>
      </div>

      <div className="relative z-10 w-full -mx-6 md:-mx-10 mt-16">
        <Footer />
      </div>
    </div>
  );
}
