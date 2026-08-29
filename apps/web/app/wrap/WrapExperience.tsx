'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Swiper, SwiperSlide, SwiperRef } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/pagination';
import { Pagination, Autoplay, EffectFade, Keyboard } from 'swiper/modules';
import Confetti from 'react-confetti';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import * as htmlToImage from 'html-to-image';
import Link from 'next/link';
import { WrapData } from '@/lib/types';
import { Swiper as SwiperType } from 'swiper';
import { SkeletonBlock, SkeletonText } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { reportError } from '@/lib/errorMonitoring';

const themes = {
  default: {
    name: 'Omni Dark',
    bg: 'bg-gradient-to-b from-black via-gray-950 to-black',
    card: 'bg-black/50 border-white/10',
    text: 'text-white',
    accent: 'text-[#1DB954]',
    muted: 'text-gray-400',
    rowBorder: 'border-white/10',
    chart: '#1DB954',
  },
  cyberpunk: {
    name: 'Cyberpunk',
    bg: 'bg-gradient-to-br from-yellow-400/20 via-purple-900 to-black',
    card: 'bg-black/70 border-yellow-400/50 shadow-[0_0_30px_rgba(250,204,21,0.2)]',
    text: 'text-yellow-300',
    accent: 'text-cyan-400',
    muted: 'text-yellow-100/70',
    rowBorder: 'border-yellow-300/20',
    chart: '#06b6d4',
  },
  sunset: {
    name: 'Sunset',
    bg: 'bg-gradient-to-br from-orange-500/30 via-red-900 to-purple-900',
    card: 'bg-white/10 border-orange-300/30 backdrop-blur-md',
    text: 'text-orange-100',
    accent: 'text-yellow-300',
    muted: 'text-orange-100/70',
    rowBorder: 'border-orange-200/20',
    chart: '#fbbf24',
  },
  minimal: {
    name: 'Minimal',
    bg: 'bg-zinc-100',
    card: 'bg-white border-zinc-200 shadow-xl',
    text: 'text-zinc-800',
    accent: 'text-zinc-500',
    muted: 'text-zinc-500',
    rowBorder: 'border-zinc-200',
    chart: '#52525b',
  },
};

type ExportFormat = 'card' | 'square' | 'story';

const exportFormats: Record<ExportFormat, { label: string; aspect: string; padding: string; width: number }> = {
  card: { label: 'Card', aspect: 'aspect-[4/5]', padding: 'p-10', width: 1080 },
  square: { label: 'Square', aspect: 'aspect-square', padding: 'p-8', width: 1080 },
  story: { label: 'Story', aspect: 'aspect-[9/16]', padding: 'p-10', width: 1080 },
};

export interface InitialShareState {
  isPublic: boolean;
  shareUrl: string | null;
}

type SlideKey = 'intro' | 'ready' | 'spotify' | 'google' | 'github' | 'strava' | 'reconnect' | 'legend' | 'share';

const PROVIDER_LABELS: Record<string, string> = {
  spotify: 'Spotify', google: 'YouTube', github: 'GitHub', strava: 'Strava',
};

/** Providers whose slide slot is always rendered in the wrap. */
const WRAP_PROVIDERS = ['spotify', 'google', 'github', 'strava'] as const;

const SLIDE_LABELS: Record<SlideKey, string> = {
  intro: 'Introduction',
  ready: 'Get ready',
  spotify: 'Spotify music stats',
  google: 'YouTube watch stats',
  github: 'GitHub coding stats',
  strava: 'Strava activity stats',
  reconnect: 'Services needing attention',
  legend: 'Your year in summary',
  share: 'Share your wrap',
};

const PROVIDER_ACCENTS: Record<string, string> = {
  spotify: '#1DB954',
  google: '#FF0000',
  github: '#6F42C1',
  strava: '#FC4C02',
};

/** Copy for providers that have produced no data yet in a wrap. */
const UNLOCK_COPY: Record<string, string> = {
  spotify: 'Connect Spotify to unlock your music stats.',
  google: 'Connect YouTube to unlock your watch stats.',
  github: 'Connect GitHub to unlock your coding stats.',
  strava: 'Connect Strava to unlock your activity stats.',
};

function formatGeneratedAt(iso: string | null): string {
  if (!iso) return 'Not generated yet';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
}

/**
 * Deterministic slide order. Every provider always gets a slot (data /
 * needs-attention / "connect to unlock"); the reconnect slide is only present
 * when something failed, so deep-link targets resolve against the live order.
 */
function computeSlideKeys(data: WrapData): SlideKey[] {
  const failed = Object.entries(data.providerStatus ?? {}).filter(([, s]) => !s.ok);
  return [
    'intro',
    'ready',
    'spotify',
    'google',
    'github',
    'strava',
    ...(failed.length > 0 ? (['reconnect'] as SlideKey[]) : []),
    'legend',
    'share',
  ];
}

/**
 * Interactive wrap playback. The Server Component hands over the cached wrap
 * when one exists; generation (which fans out to every provider API) still runs
 * through GET /api/wrap so a first-time visit doesn't block TTFB. The Refresh
 * button forces a POST, and the cache age comes back in X-Wrap-Generated-At.
 *
 * Every provider gets a deterministic slide slot (data / needs-attention /
 * "connect to unlock") so the slide order is stable and deep-linkable via
 * `?year=&slide=`, with keyboard navigation, a screen-reader announcement per
 * slide, a slide progress bar, and an autoplay pause toggle.
 */
export default function WrapExperience({
  initialData,
  initialShare,
  year,
  initialGeneratedAt = null,
  availableYears = [],
  initialSlideKey = null,
}: {
  initialData: WrapData | null;
  initialShare: InitialShareState;
  year: number;
  initialGeneratedAt?: string | null;
  availableYears?: number[];
  initialSlideKey?: string | null;
}) {
  const [data, setData] = useState<WrapData | null>(initialData);
  const [loading, setLoading] = useState(initialData === null);
  const [refreshing, setRefreshing] = useState(false);
  const [switchingYear, setSwitchingYear] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(initialGeneratedAt);
  const [activeYear, setActiveYear] = useState(year);
  const [years, setYears] = useState<number[]>(() =>
    Array.from(new Set([year, ...availableYears])).sort((a, b) => b - a),
  );
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiEnabled, setConfettiEnabled] = useState(
    () => typeof window === 'undefined' || window.localStorage.getItem('ow-confetti') !== 'off',
  );
  const [currentTheme, setCurrentTheme] = useState<keyof typeof themes>('default');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('card');
  const [includeWatermark, setIncludeWatermark] = useState(true);
  const [isPublic, setIsPublic] = useState(initialShare.isPublic);
  const [shareUrl, setShareUrl] = useState<string | null>(initialShare.shareUrl);
  const [shareLoading, setShareLoading] = useState(false);
  const [activeSlideKey, setActiveSlideKey] = useState<SlideKey>('intro');
  const [autoplayPaused, setAutoplayPaused] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const shareCardRef = useRef<HTMLDivElement>(null);
  const swiperRef = useRef<SwiperRef | null>(null);
  const confettiFired = useRef(false);
  const deepLinkApplied = useRef(false);
  const theme = themes[currentTheme];
  const prefersReducedMotion = !!useReducedMotion();
  const { showToast } = useToast();

  // Only runs when the server found no cached wrap: this call generates one.
  useEffect(() => {
    if (initialData !== null) return;
    let cancelled = false;

    async function generateWrap() {
      try {
        const res = await fetch(`/api/wrap?year=${year}`);
        if (!res.ok) throw new Error('Failed to fetch wrap');
        const json = (await res.json()) as WrapData;
        if (!cancelled) {
          setData(json);
          setGeneratedAt(res.headers.get('X-Wrap-Generated-At'));
        }
      } catch (err) {
        reportError(err, { scope: 'wrap.fetch', year });
        if (!cancelled) {
          setError(`Could not load your ${year} Wrap. Make sure you are logged in and have connected at least one service!`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    generateWrap();

    return () => {
      cancelled = true;
    };
  }, [initialData, year]);

  // Keyboard arrows navigate slides even when focus isn't inside the carousel.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(event.key)) {
        swiperRef.current?.swiper.slidePrev();
      } else if (['ArrowDown', 'ArrowRight', 'PageDown'].includes(event.key)) {
        swiperRef.current?.swiper.slideNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Landing on ?slide=spotify: hop to that slide once the wrap data resolves.
  useEffect(() => {
    if (!initialSlideKey || !data || deepLinkApplied.current) return;
    deepLinkApplied.current = true;
    const index = computeSlideKeys(data).indexOf(initialSlideKey as SlideKey);
    if (index >= 0) {
      const raf = requestAnimationFrame(() => swiperRef.current?.swiper.slideTo(index, 0));
      return () => cancelAnimationFrame(raf);
    }
  }, [data, initialSlideKey]);

  const refreshWrap = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/wrap?year=${activeYear}`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to refresh wrap');
      const json = (await res.json()) as WrapData;
      setData(json);
      setGeneratedAt(res.headers.get('X-Wrap-Generated-At'));
      setYears((prev) => Array.from(new Set([activeYear, ...prev])).sort((a, b) => b - a));
      showToast('Your wrap has been refreshed!', 'success');
    } catch (err) {
      reportError(err, { scope: 'wrap.refresh', year: activeYear });
      showToast('Could not refresh your wrap. Please try again.', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  // Switch year: fetch the cached wrap (or generate on miss) plus that year's
  // public-sharing state, then hop through every provider slot.
  const loadYear = async (targetYear: number) => {
    setSwitchingYear(true);
    try {
      const [wrapRes, shareRes] = await Promise.all([
        fetch(`/api/wrap?year=${targetYear}`),
        fetch(`/api/wrap/share?year=${targetYear}`),
      ]);
      if (!wrapRes.ok) throw new Error('Failed to load wrap for that year');
      const wrapJson = (await wrapRes.json()) as WrapData;
      const shareJson = shareRes.ok ? ((await shareRes.json()) as { isPublic?: boolean; shareUrl?: string | null }) : null;
      setData(wrapJson);
      setGeneratedAt(wrapRes.headers.get('X-Wrap-Generated-At'));
      setIsPublic(Boolean(shareJson?.isPublic));
      setShareUrl(shareJson?.shareUrl ?? null);
      setActiveYear(targetYear);
      setYears((prev) => Array.from(new Set([targetYear, ...prev])).sort((a, b) => b - a));
      confettiFired.current = false;
    } catch (err) {
      reportError(err, { scope: 'wrap.yearSwitch', year: targetYear });
      showToast('Could not load that year. Please try again.', 'error');
    } finally {
      setSwitchingYear(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
        <p className="text-xl font-medium text-gray-400 mb-10" aria-live="polite">
          Aggregating your digital year...
        </p>
        <div className="w-full max-w-md p-8 rounded-3xl border border-white/10 bg-white/5" aria-busy="true">
          <SkeletonText lines={1} className="mb-6" />
          <div className="grid grid-cols-2 gap-4 mb-6">
            {WRAP_PROVIDERS.map((provider) => (
              <div key={provider} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <SkeletonBlock className="h-3 w-1/2" />
                <SkeletonText lines={2} />
              </div>
            ))}
          </div>
          <SkeletonBlock className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-4xl font-black text-white mb-6">😕 Oops!</h1>
        <p className="text-xl text-gray-400 mb-10 max-w-lg">{error}</p>
        <Link href="/dashboard">
          <button className="px-8 py-4 bg-[#1DB954] text-black font-bold rounded-xl hover:scale-105 transition-all">
            Go to Dashboard
          </button>
        </Link>
      </div>
    );
  }

  /** Resolve how a provider slot should render for the current wrap. */
  const providerState = (provider: string): 'data' | 'attention' | 'unlock' => {
    const slot = (data as Record<string, unknown>)[provider];
    if (slot) return 'data';
    const status = data.providerStatus?.[provider];
    if (status && !status.ok) return 'attention';
    return 'unlock';
  };

  const hasAnyProviderData = Boolean(
    data.spotify || data.google || data.github || data.strava,
  );
  const failedProviders = Object.entries(data.providerStatus ?? {}).filter(([, s]) => !s.ok);
  const slideKeys = computeSlideKeys(data);
  const slideIndexFor = (key: SlideKey) => slideKeys.indexOf(key);
  const totalSlides = slideKeys.length;

  // Empty wrap: no connections returned data (or there were no connections at
  // all). Guide the user to the dashboard — per-provider, so they know exactly
  // what's missing.
  if (!hasAnyProviderData) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-4xl font-black text-white mb-4">No data yet</h1>
        <p className="text-xl text-gray-400 mb-8 max-w-lg">
          Connect at least one service to unlock your {activeYear} OmniWrap.
        </p>
        <div className="w-full max-w-2xl mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          {WRAP_PROVIDERS.map((provider) => {
            const status = data.providerStatus?.[provider];
            const needsReconnect = Boolean(status && !status.ok);
            return (
              <div key={provider} className="bg-white/5 rounded-2xl p-5 border border-white/10">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="font-bold text-white">{PROVIDER_LABELS[provider]}</span>
                  <span className={`text-xs font-bold uppercase tracking-wider ${needsReconnect ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {needsReconnect ? 'Needs attention' : 'Not connected'}
                  </span>
                </div>
                <p className="text-sm text-gray-400 min-h-[2.5rem]">
                  {needsReconnect
                    ? (status?.message || status?.error || 'Reconnect to include this service.')
                    : UNLOCK_COPY[provider]}
                </p>
                <Link href="/dashboard">
                  <button className="mt-3 w-full py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-bold text-white transition-all">
                    {needsReconnect ? 'Reconnect' : 'Connect'}
                  </button>
                </Link>
              </div>
            );
          })}
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/dashboard">
            <button className="px-8 py-4 bg-[#1DB954] text-black font-bold rounded-xl hover:scale-105 transition-all">
              Connect services
            </button>
          </Link>
          <button
            onClick={refreshWrap}
            disabled={refreshing}
            className="px-8 py-4 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-all disabled:opacity-50"
          >
            {refreshing ? 'Refreshing…' : 'Try again'}
          </button>
        </div>
      </div>
    );
  }

  // Honest chart: only real, measured time (Spotify minutes + YouTube watch
  // hours) appears as "hours". Commits and km are shown as their own counts on
  // their own slides — never converted into fake hours.
  const chartData = [
    { name: 'Spotify', hours: (data.spotify?.minutes || 0) / 60 },
    { name: 'YouTube', hours: data.google?.watchHours || 0 },
  ].filter((d) => d.hours > 0);
  const trackedHours = Math.round(chartData.reduce((sum, d) => sum + d.hours, 0));

  // Summary only advertises categories that actually returned data.
  const categoryStats: { label: string; value: string }[] = [];
  if (data.spotify) categoryStats.push({ label: 'Music', value: `${Math.round(data.spotify.minutes / 60)}h` });
  if (data.google) categoryStats.push({ label: 'Video', value: `${data.google.watchHours}h` });
  if (data.github) categoryStats.push({ label: 'Code', value: `${data.github.commits.toLocaleString()} commits` });
  if (data.strava) categoryStats.push({ label: 'Fitness', value: `${data.strava.distanceKm.toLocaleString()} km` });

  const nodeForProvider = (provider: string): ReactNode => {
    const state = providerState(provider);
    const accent = PROVIDER_ACCENTS[provider] ?? theme.chart;
    const label = PROVIDER_LABELS[provider] ?? provider;

    // Not connected (or connected but produced nothing): honest unlock slide.
    if (state === 'unlock') {
      return (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          className={`w-full max-w-4xl p-12 rounded-3xl border shadow-2xl mx-4 backdrop-blur-xl ${theme.card} ${theme.text} text-center`}
        >
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/50 mb-6" style={{ color: accent }}>
            {label}
          </p>
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            {label} highlights are locked
          </h2>
          <p className="text-xl opacity-70 mb-10">{UNLOCK_COPY[provider] ?? `Connect ${label} to unlock.`}</p>
          <Link href="/dashboard">
            <button
              className="px-8 py-4 rounded-full font-black text-black hover:scale-105 transition-all"
              style={{ backgroundColor: accent, color: '#000' }}
            >
              Connect {label}
            </button>
          </Link>
        </motion.div>
      );
    }

    // Connected but the fetch failed / token expired: reconnect CTA.
    if (state === 'attention') {
      const status = data.providerStatus?.[provider];
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`w-full max-w-4xl p-12 rounded-3xl border shadow-2xl mx-4 backdrop-blur-xl ${theme.card} ${theme.text} text-center`}
        >
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-yellow-400 mb-6">{label}</p>
          <h2 className="text-4xl md:text-5xl font-black mb-4 text-yellow-400">Couldn&apos;t fetch {label} data</h2>
          <p className="text-xl opacity-70 mb-10">{status?.message || status?.error || 'Reconnect to include it again.'}</p>
          <Link href="/dashboard">
            <button className="px-8 py-4 rounded-full bg-yellow-400 text-black font-black hover:scale-105 transition-all">
              Reconnect {label}
            </button>
          </Link>
        </motion.div>
      );
    }

    // Data slide — same stats as always, with honest "estimated" labels.
    switch (provider) {
      case 'spotify':
        return (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={`w-full max-w-4xl p-12 rounded-3xl border shadow-2xl mx-4 backdrop-blur-xl ${theme.card} ${theme.text}`}>
            <h2 className={`text-5xl font-black mb-10 text-center ${theme.accent}`}>Music Vibes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-center md:text-left">
              <div>
                <p className="text-xl uppercase tracking-widest opacity-60">Top Artist</p>
                <p className="text-4xl font-black mt-2">{data.spotify!.topArtist}</p>
                <p className="text-xl mt-4 opacity-60">Top Track: {data.spotify!.topSong}</p>
              </div>
              <div className="flex flex-col justify-center items-center md:items-end">
                <p className="text-6xl font-black">{Math.round(data.spotify!.minutes / 60)}</p>
                <p className="text-xl uppercase tracking-widest opacity-60">
                  {data.spotify!.minutesNote ? 'Est. Hours Listened' : 'Hours Listened'}
                </p>
                {data.spotify!.minutesNote && (
                  <p className={`text-sm ${theme.muted} mt-2 italic`}>{data.spotify!.minutesNote}</p>
                )}
              </div>
            </div>
          </motion.div>
        );
      case 'google':
        return (
          <motion.div initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} className={`w-full max-w-4xl p-12 rounded-3xl border shadow-2xl mx-4 backdrop-blur-xl ${theme.card} ${theme.text}`}>
            <h2 className="text-5xl font-black mb-10 text-center text-[#FF0000]">Watching Habits</h2>
            <div className="text-center">
              <p className="text-xl uppercase tracking-widest opacity-60">Most Watched</p>
              <p className="text-3xl font-black mt-4 px-6 italic">&quot;{data.google!.topVideo}&quot;</p>
              <div className="mt-12 p-6 bg-white/5 rounded-2xl">
                <p className="text-5xl font-black">{data.google!.watchHours} hrs</p>
                <p className="text-lg opacity-60">
                  {data.google!.watchHoursNote ? 'Est. on YouTube' : 'Spent on YouTube'}
                </p>
                {data.google!.watchHoursNote && (
                  <p className={`text-sm ${theme.muted} mt-2 italic`}>{data.google!.watchHoursNote}</p>
                )}
              </div>
            </div>
          </motion.div>
        );
      case 'github':
        return (
          <motion.div initial={{ opacity: 0, rotateY: 90 }} animate={{ opacity: 1, rotateY: 0 }} className={`w-full max-w-4xl p-12 rounded-3xl border shadow-2xl mx-4 backdrop-blur-xl ${theme.card} ${theme.text}`}>
            <h2 className="text-5xl font-black mb-10 text-center text-[#6F42C1]">Code Journey</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white/5 p-8 rounded-2xl text-center">
                <p className="text-6xl font-black">{data.github!.commits.toLocaleString()}</p>
                <p className="text-xl opacity-60">Total Commits</p>
              </div>
              <div className="bg-white/5 p-8 rounded-2xl">
                <p className="text-xl opacity-60 mb-4">Top Repository</p>
                <p className="text-2xl font-bold truncate">{data.github!.topRepo}</p>
                <div className="flex gap-2 mt-6 flex-wrap">
                  {data.github!.languages?.map((l: string) => (
                    <span key={l} className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold">{l}</span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        );
      case 'strava':
        return (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className={`w-full max-w-4xl p-12 rounded-3xl border shadow-2xl mx-4 backdrop-blur-xl ${theme.card} ${theme.text}`}>
            <h2 className="text-5xl font-black mb-10 text-center text-[#FC4C02]">Active Lifestyle</h2>
            <div className="flex flex-col items-center text-center">
              <div className="w-32 h-32 rounded-full border-4 border-[#FC4C02] flex items-center justify-center mb-6">
                <span className="text-4xl">🏃</span>
              </div>
              <p className="text-6xl font-black">{data.strava!.distanceKm.toLocaleString()} km</p>
              <p className="text-xl opacity-60 mt-2">Conquered in {activeYear}</p>
              <p className="text-2xl font-bold mt-8 text-white/80">{data.strava!.activities} Sessions across the year</p>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  const handleSlideChange = (swiper: SwiperType) => {
    const key = slideKeys[swiper.activeIndex] ?? 'intro';
    const label = SLIDE_LABELS[key] ?? key;
    setActiveSlideKey(key);
    setAnnouncement(`Slide ${swiper.activeIndex + 1} of ${totalSlides}: ${label}`);

    // Shareable deep links: keep the URL in sync as the user navigates.
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('year', String(activeYear));
      url.searchParams.set('slide', key);
      window.history.replaceState(null, '', url.toString());
    } catch {
      // Ignore — deep links are a progressive enhancement.
    }

    // Confetti fires once on the summary (legend) slide, only when enabled.
    if (key === 'legend') {
      if (!confettiFired.current) {
        confettiFired.current = true;
        if (confettiEnabled && !prefersReducedMotion) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 6000);
        }
      }
    }
  };

  const toggleAutoplay = () => {
    if (autoplayPaused) {
      swiperRef.current?.swiper.autoplay?.start();
    } else {
      swiperRef.current?.swiper.autoplay?.stop();
    }
    setAutoplayPaused((p) => !p);
  };

  const downloadShareCard = async () => {
    if (shareCardRef.current) {
      try {
        const node = shareCardRef.current;
        const renderedWidth = node.getBoundingClientRect().width;
        const pixelRatio = renderedWidth > 0 ? exportFormats[exportFormat].width / renderedWidth : 2;
        const dataUrl = await htmlToImage.toPng(node, { pixelRatio });
        const link = document.createElement('a');
        link.download = `omniwrap-${activeYear}-${currentTheme}-${exportFormat}.png`;
        link.href = dataUrl;
        link.click();
        showToast('Share card downloaded!', 'success');
      } catch (err) {
        reportError(err, { scope: 'wrap.shareCard', year: activeYear, theme: currentTheme, format: exportFormat });
        showToast('Could not generate the share card. Please try again.', 'error');
      }
    }
  };

  const toggleShare = async (enabled: boolean) => {
    setShareLoading(true);
    try {
      const res = await fetch(`/api/wrap/share?year=${activeYear}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error('Failed to update sharing');
      const json = (await res.json()) as { isPublic: boolean; shareUrl?: string | null };
      setIsPublic(Boolean(json.isPublic));
      setShareUrl(json.shareUrl ?? null);
      showToast(enabled ? 'Your wrap snapshot is now public.' : 'Your wrap snapshot is now private.', 'success');
    } catch (err) {
      reportError(err, { scope: 'wrap.shareToggle', year: activeYear });
      showToast('Could not update sharing settings. Please try again.', 'error');
    } finally {
      setShareLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await copyToClipboard(shareUrl);
      showToast('Link copied to clipboard!', 'success');
    } catch (err) {
      reportError(err, { scope: 'wrap.clipboard' });
      showToast('Could not copy the link.', 'error');
    }
  };

  /** Copy a deep link to the current slide (works without a public snapshot). */
  const copyWrapLink = async () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('year', String(activeYear));
      url.searchParams.set('slide', activeSlideKey);
      await copyToClipboard(url.toString());
      showToast('Link to this slide copied!', 'success');
    } catch (err) {
      reportError(err, { scope: 'wrap.clipboard' });
      showToast('Could not copy the link.', 'error');
    }
  };

  /** Native share sheet when available (Web Share API), clipboard otherwise. */
  const shareToDevice = async () => {
    const url = shareUrl ?? new URL(window.location.href).toString();
    const shareData = {
      title: `My ${activeYear} OmniWrap`,
      text: `Check out my ${activeYear} OmniWrap! I spent ${data.aggregated?.totalHours || 0} hours across my digital life. Generated at omniwrap.com 🔥 #OmniWrap${activeYear}`,
      url,
    };
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') return;
        reportError(err, { scope: 'wrap.nativeShare', year: activeYear });
      }
    }
    try {
      await copyToClipboard(shareData.url);
      showToast('Link copied to clipboard!', 'success');
    } catch (err) {
      reportError(err, { scope: 'wrap.clipboard' });
      showToast('Could not copy the link.', 'error');
    }
  };

  const progress = ((slideIndexFor(activeSlideKey) + 1) / totalSlides) * 100;

  // The share card lists only categories that actually have data.
  const rows: { label: string; value: string }[] = [];
  if (trackedHours > 0) rows.push({ label: 'Tracked Time', value: `${data.aggregated?.totalHours || trackedHours}h` });
  if (data.spotify) rows.push({ label: 'Top Track', value: data.spotify.topSong });
  if (data.github) rows.push({ label: 'Code Commits', value: data.github.commits.toLocaleString() });
  if (data.strava) rows.push({ label: 'Fitness', value: `${data.strava.distanceKm.toLocaleString()}km` });

  return (
    <div className={`relative min-h-screen overflow-hidden transition-colors duration-1000 ${theme.bg}`}>
      {showConfetti && !prefersReducedMotion && <Confetti numberOfPieces={250} recycle={false} gravity={0.1} />}

      {/* Slide progress indicator */}
      <div
        className="fixed top-0 left-0 z-50 h-1 bg-white/40 transition-[width] duration-500 pointer-events-none"
        style={{ width: `${progress}%` }}
        aria-hidden="true"
      />

      {/* Exit / back to dashboard — always reachable, never loses the wrap */}
      <div className="fixed top-5 left-5 z-50">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/70 backdrop-blur-2xl border border-white/10 shadow-2xl text-sm font-bold text-white hover:text-[#1DB954] transition-colors"
        >
          <span aria-hidden="true">←</span> Exit
        </Link>
      </div>

      {/* Controls: year selector, autoplay pause, refresh + last-updated timestamp */}
      <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-black/70 backdrop-blur-2xl border border-white/10 rounded-full px-4 py-2.5 shadow-2xl">
        {years.length > 1 && (
          <>
            {switchingYear && <span className="text-xs text-gray-400" aria-live="polite">Loading…</span>}
            <select
              value={activeYear}
              onChange={(e) => loadYear(Number(e.target.value))}
              disabled={switchingYear}
              aria-label="Select wrap year"
              className="bg-black/60 text-white text-sm font-bold rounded-lg px-2 py-1 border border-white/20 cursor-pointer disabled:opacity-50"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </>
        )}
        {!prefersReducedMotion && (
          <button
            onClick={toggleAutoplay}
            title={autoplayPaused ? 'Resume autoplay' : 'Pause autoplay'}
            aria-label={autoplayPaused ? 'Resume autoplay' : 'Pause autoplay'}
            className="text-sm font-bold text-white hover:text-[#1DB954] transition-colors focus:outline-none"
          >
            {autoplayPaused ? '▶' : '⏸'}
          </button>
        )}
        <button
          onClick={refreshWrap}
          disabled={refreshing || switchingYear}
          className="text-sm font-bold text-white hover:text-[#1DB954] transition-colors focus:outline-none disabled:opacity-50"
        >
          {refreshing ? 'Refreshing…' : '↻ Refresh'}
        </button>
        <span className="text-xs text-gray-400" title="Last generated">
          {formatGeneratedAt(generatedAt)}
        </span>
      </div>

      {/* Screen-reader announcements on slide change */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      <Swiper
        ref={swiperRef}
        direction="vertical"
        pagination={{ clickable: true, dynamicBullets: true }}
        modules={[Pagination, Autoplay, EffectFade, Keyboard]}
        autoplay={prefersReducedMotion ? false : { delay: 8000, disableOnInteraction: true, pauseOnMouseEnter: true }}
        keyboard={{ enabled: true, onlyInViewport: false }}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        speed={prefersReducedMotion ? 0 : 1200}
        className="h-screen"
        onSlideChange={handleSlideChange}
      >
        {/* Slide: Intro */}
        <SwiperSlide className="flex items-center justify-center">
          <motion.div initial={{ opacity: 0, y: 80 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.4 }} className="text-center px-8" role="group" aria-label={SLIDE_LABELS.intro}>
            <h1 className={`text-6xl md:text-8xl font-black bg-clip-text text-transparent bg-gradient-to-r ${currentTheme === 'minimal' ? 'from-zinc-900 to-zinc-500' : 'from-white via-purple-300 to-indigo-300'} tracking-tighter mb-6`}>
              OmniWrap {activeYear}
            </h1>
            <p className={`text-2xl md:text-3xl font-light ${theme.text}`}>Your digital year, unified.</p>
          </motion.div>
        </SwiperSlide>

        {/* Slide: Ready? */}
        <SwiperSlide className="flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center" role="group" aria-label={SLIDE_LABELS.ready}>
            <h2 className={`text-7xl md:text-9xl font-black mb-8 ${theme.text}`}>READY?</h2>
            <div className="flex justify-center gap-4">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2, delay: i * 0.4 }}
                  className={`w-4 h-4 rounded-full ${currentTheme === 'minimal' ? 'bg-zinc-800' : 'bg-white'}`}
                />
              ))}
            </div>
          </motion.div>
        </SwiperSlide>

        {/* One deterministic slot per provider: data / attention / unlock */}
        {WRAP_PROVIDERS.map((provider) => (
          <SwiperSlide key={provider} className="flex items-center justify-center">
            <div role="group" aria-label={SLIDE_LABELS[provider as SlideKey]}>
              {nodeForProvider(provider)}
            </div>
          </SwiperSlide>
        ))}

        {/* Slide: reconnect CTA for failed providers */}
        {failedProviders.length > 0 && (
          <SwiperSlide className="flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              role="group"
              aria-label={SLIDE_LABELS.reconnect}
              className={`w-full max-w-4xl p-12 rounded-3xl border shadow-2xl mx-4 backdrop-blur-xl ${theme.card} ${theme.text}`}
            >
              <h2 className="text-4xl font-black mb-8 text-center text-yellow-400">Some Services Need Attention</h2>
              <p className="text-lg opacity-60 text-center mb-8">Reconnect to include their data in your wrap:</p>
              <div className="flex flex-col gap-4">
                {failedProviders.map(([provider, status]) => (
                  <div key={provider} className="flex items-center justify-between p-4 bg-white/5 rounded-xl gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: theme.chart }} />
                      <span className="font-bold whitespace-nowrap">{PROVIDER_LABELS[provider] ?? provider}</span>
                      <span className="text-sm opacity-75 truncate">{status.message || status.error}</span>
                    </div>
                    <Link href="/dashboard" className="shrink-0">
                      <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold transition-all">
                        Reconnect
                      </button>
                    </Link>
                  </div>
                ))}
              </div>
            </motion.div>
          </SwiperSlide>
        )}

        {/* Slide: The Legend (Aggregated) — only real categories with data */}
        <SwiperSlide className="flex items-center justify-center overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            role="group"
            aria-label={SLIDE_LABELS.legend}
            className={`w-full max-w-5xl p-12 rounded-3xl border shadow-2xl mx-4 backdrop-blur-xl ${theme.card} ${theme.text} text-center`}
          >
            <h2 className="text-6xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-purple-500 to-red-500">
              YOU ARE A LEGEND
            </h2>
            <p className="text-3xl mb-12">
              Total Tracked Time:{' '}
              <span className="font-black">{trackedHours > 0 ? `${trackedHours} Hours` : '—'}</span>
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-10">
              {categoryStats.map((c) => (
                <div key={c.label} className={`px-6 py-4 rounded-2xl border ${theme.card} ${theme.text}`}>
                  <p className="text-2xl font-black">{c.value}</p>
                  <p className={`text-sm uppercase tracking-widest ${theme.muted}`}>{c.label}</p>
                </div>
              ))}
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" hide />
                  <Tooltip contentStyle={{ background: '#000', border: 'none', borderRadius: '8px' }} />
                  <Bar dataKey="hours" fill={theme.chart} radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className={`text-xl ${theme.muted}`}>
                Time-based data (music/video) wasn&apos;t available — your other stats are on the slides above.
              </p>
            )}
            <p className={`mt-10 text-xl ${theme.muted}`}>You&apos;ve mastered the digital realm in {activeYear}.</p>
          </motion.div>
        </SwiperSlide>

        {/* Slide: Share */}
        <SwiperSlide className="flex flex-col items-center justify-center overflow-y-auto pt-20 pb-10">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-8 w-full max-w-4xl px-4" role="group" aria-label={SLIDE_LABELS.share}>
            <h2 className={`text-4xl md:text-5xl font-black text-center ${theme.text}`}>Customize & Share</h2>
            <div className="flex flex-wrap justify-center gap-4 bg-black/40 p-3 rounded-2xl backdrop-blur-md border border-white/10">
              {Object.keys(themes).map((k) => (
                <button key={k} onClick={() => setCurrentTheme(k as keyof typeof themes)} className={`px-5 py-2 rounded-full font-bold transition-all ${currentTheme === k ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                  {themes[k as keyof typeof themes].name}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 bg-black/40 p-3 rounded-2xl backdrop-blur-md border border-white/10">
              <div className="flex gap-2">
                {(Object.keys(exportFormats) as ExportFormat[]).map((k) => (
                  <button key={k} onClick={() => setExportFormat(k)} className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${exportFormat === k ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    {exportFormats[k].label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-white/80 cursor-pointer">
                <input type="checkbox" checked={includeWatermark} onChange={(e) => setIncludeWatermark(e.target.checked)} className="w-4 h-4 accent-[#1DB954]" />
                Watermark
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-white/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confettiEnabled}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setConfettiEnabled(on);
                    try {
                      window.localStorage.setItem('ow-confetti', on ? 'on' : 'off');
                    } catch {
                      // Private browsing — just don't persist.
                    }
                  }}
                  className="w-4 h-4 accent-[#1DB954]"
                />
                Confetti
              </label>
            </div>

            <div
              ref={shareCardRef}
              className={`relative w-full max-w-sm ${exportFormats[exportFormat].aspect} ${exportFormats[exportFormat].padding} rounded-3xl flex flex-col border-4 shadow-2xl ${theme.bg} ${theme.card} ${theme.text} ${includeWatermark ? 'pb-14' : ''}`}
              style={{ borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <div>
                <h3 className={`text-4xl font-black mb-2 ${theme.accent}`}>OmniWrap {activeYear}</h3>
                <p className={`opacity-70 text-lg italic ${theme.muted}`}>My Digital Legacy</p>
              </div>
              <div className="space-y-4 flex-1 flex flex-col justify-center">
                {rows.map((row) => (
                  <div key={row.label} className={`flex justify-between border-b ${theme.rowBorder} pb-2`}>
                    <span className={theme.muted}>{row.label}</span>
                    <span className="font-black truncate max-w-[55%] text-right">{row.value}</span>
                  </div>
                ))}
                {rows.length === 0 && <p className={`text-center opacity-60 ${theme.muted}`}>Connect services to build your recap.</p>}
              </div>
              {includeWatermark && (
                <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm">
                  <p className="text-[10px] font-bold tracking-wide opacity-80">OMNIWRAP.COM</p>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-3 bg-black/40 p-5 rounded-2xl backdrop-blur-md border border-white/10 w-full max-w-md">
              <label className="flex items-center gap-2 font-bold text-white/90 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  disabled={shareLoading}
                  onChange={(e) => toggleShare(e.target.checked)}
                  className="w-4 h-4 accent-[#1DB954]"
                />
                Make my wrap snapshot public
              </label>
              {isPublic && shareUrl && (
                <div className="flex items-center gap-2 w-full">
                  <input
                    readOnly
                    value={shareUrl}
                    onFocus={(e) => e.target.select()}
                    className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white/10 text-white text-sm truncate"
                  />
                  <button onClick={copyShareUrl} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-all">
                    Copy
                  </button>
                </div>
              )}
              <p className="text-xs text-white/50 text-center">
                {isPublic
                  ? 'Anyone with the link sees a limited snapshot (hours, top track, commits, distance) — no account details.'
                  : 'Turn this on to get a public snapshot link. Note: time-based stats are estimated from recent activity.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center flex-wrap">
              <button onClick={downloadShareCard} className={`flex-1 max-w-xs px-10 py-4 text-xl font-black rounded-full shadow-xl transition-all hover:scale-105 ${currentTheme === 'minimal' ? 'bg-black text-white' : 'bg-white text-black'}`}>
                Download Image
              </button>

              <button
                onClick={shareToDevice}
                className="flex-1 max-w-xs px-10 py-4 text-xl font-black rounded-full bg-[#1DB954] text-black shadow-xl transition-all hover:scale-105"
              >
                Share
              </button>

              <button
                onClick={copyWrapLink}
                title="Copy a link to this slide"
                className="flex-1 max-w-xs px-10 py-4 text-xl font-black rounded-full bg-white/10 text-white border border-white/20 shadow-xl transition-all hover:scale-105"
              >
                Copy Link
              </button>

              <button
                onClick={() => {
                  const text = `Check out my ${activeYear} OmniWrap! I spent ${data.aggregated?.totalHours || 0} hours across my digital life. Generate yours at omniwrap.com 🔥 #OmniWrap${activeYear}`;
                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="flex-1 max-w-xs px-10 py-4 text-xl font-black rounded-full bg-[#1DA1F2] text-white shadow-xl transition-all hover:scale-105 flex items-center justify-center gap-2"
              >
                <span>Share to X</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.045 4.126H5.078z" /></svg>
              </button>
            </div>
          </motion.div>
        </SwiperSlide>
      </Swiper>
    </div>
  );
}
