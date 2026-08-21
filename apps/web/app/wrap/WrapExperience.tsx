'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/pagination';
import { Pagination, Autoplay, EffectFade } from 'swiper/modules';
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
    chart: '#1DB954',
  },
  cyberpunk: {
    name: 'Cyberpunk',
    bg: 'bg-gradient-to-br from-yellow-400/20 via-purple-900 to-black',
    card: 'bg-black/70 border-yellow-400/50 shadow-[0_0_30px_rgba(250,204,21,0.2)]',
    text: 'text-yellow-300',
    accent: 'text-cyan-400',
    chart: '#06b6d4',
  },
  sunset: {
    name: 'Sunset',
    bg: 'bg-gradient-to-br from-orange-500/30 via-red-900 to-purple-900',
    card: 'bg-white/10 border-orange-300/30 backdrop-blur-md',
    text: 'text-orange-100',
    accent: 'text-yellow-300',
    chart: '#fbbf24',
  },
  minimal: {
    name: 'Minimal',
    bg: 'bg-zinc-100',
    card: 'bg-white border-zinc-200 shadow-xl',
    text: 'text-zinc-800',
    accent: 'text-zinc-500',
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

const PROVIDER_LABELS: Record<string, string> = {
  spotify: 'Spotify', google: 'YouTube', github: 'GitHub', strava: 'Strava',
};

function formatGeneratedAt(iso: string | null): string {
  if (!iso) return 'Not generated yet';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
}

/**
 * Interactive wrap playback. The Server Component hands over the cached wrap
 * when one exists; generation (which fans out to every provider API) still runs
 * through GET /api/wrap so a first-time visit doesn't block TTFB. The Refresh
 * button forces a POST, and the cache age comes back in X-Wrap-Generated-At.
 */
export default function WrapExperience({
  initialData,
  initialShare,
  year,
}: {
  initialData: WrapData | null;
  initialShare: InitialShareState;
  year: number;
}) {
  const [data, setData] = useState<WrapData | null>(initialData);
  const [loading, setLoading] = useState(initialData === null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<keyof typeof themes>('default');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('card');
  const [includeWatermark, setIncludeWatermark] = useState(true);
  const [isPublic, setIsPublic] = useState(initialShare.isPublic);
  const [shareUrl, setShareUrl] = useState<string | null>(initialShare.shareUrl);
  const [shareLoading, setShareLoading] = useState(false);

  const shareCardRef = useRef<HTMLDivElement>(null);
  const theme = themes[currentTheme];
  const prefersReducedMotion = useReducedMotion();
  const { showToast } = useToast();

  // Only runs when the server found no cached wrap: this call generates one.
  useEffect(() => {
    if (initialData !== null) return;
    let cancelled = false;

    async function generateWrap() {
      try {
        const res = await fetch('/api/wrap');
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

  const refreshWrap = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/wrap', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to refresh wrap');
      const json = (await res.json()) as WrapData;
      setData(json);
      setGeneratedAt(res.headers.get('X-Wrap-Generated-At'));
      showToast('Your wrap has been refreshed!', 'success');
    } catch (err) {
      reportError(err, { scope: 'wrap.refresh', year });
      showToast('Could not refresh your wrap. Please try again.', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
        <p className="text-xl font-medium text-gray-400 mb-10" aria-live="polite">
          Aggregating your digital year...
        </p>
        <div className="w-full max-w-md p-8 rounded-3xl border border-white/10 bg-white/5">
          <SkeletonBlock className="h-8 w-2/3 mb-6" />
          <SkeletonText lines={3} />
          <SkeletonBlock className="h-24 w-full mt-6" />
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

  const hasAnyProviderData = Boolean(
    data.spotify || data.google || data.github || data.strava || data.duolingo,
  );
  const failedProviders = Object.entries(data.providerStatus ?? {}).filter(([, s]) => !s.ok);

  // Empty wrap: no connections returned data (or there were no connections at
  // all). Guide the user to the dashboard instead of showing empty slides.
  if (!hasAnyProviderData) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-4xl font-black text-white mb-4">No data yet</h1>
        <p className="text-xl text-gray-400 mb-8 max-w-lg">
          Connect at least one service to unlock your {year} OmniWrap.
        </p>
        {failedProviders.length > 0 && (
          <div className="w-full max-w-md mb-8 bg-white/5 rounded-2xl p-5 text-left space-y-3">
            <p className="text-sm font-bold text-white/80 uppercase tracking-wider">
              Services that need attention
            </p>
            {failedProviders.map(([provider, status]) => (
              <div key={provider} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-3 h-3 rounded-full bg-yellow-400 shrink-0" />
                  <span className="font-semibold text-white truncate">
                    {PROVIDER_LABELS[provider] ?? provider}
                  </span>
                </div>
                <span className="text-sm text-gray-400 truncate">{status.message || status.error}</span>
              </div>
            ))}
          </div>
        )}
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

  const handleSlideChange = (swiper: SwiperType) => {
    if (swiper.activeIndex === 7 && !prefersReducedMotion) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 8000);
    }
  };

  const downloadShareCard = async () => {
    if (shareCardRef.current) {
      try {
        const node = shareCardRef.current;
        const renderedWidth = node.getBoundingClientRect().width;
        const pixelRatio = renderedWidth > 0 ? exportFormats[exportFormat].width / renderedWidth : 2;
        const dataUrl = await htmlToImage.toPng(node, { pixelRatio });
        const link = document.createElement('a');
        link.download = `omniwrap-${year}-${currentTheme}-${exportFormat}.png`;
        link.href = dataUrl;
        link.click();
        showToast('Share card downloaded!', 'success');
      } catch (err) {
        reportError(err, { scope: 'wrap.shareCard', year, theme: currentTheme, format: exportFormat });
        showToast('Could not generate the share card. Please try again.', 'error');
      }
    }
  };

  const toggleShare = async (enabled: boolean) => {
    setShareLoading(true);
    try {
      const res = await fetch(`/api/wrap/share?year=${year}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error('Failed to update sharing');
      const json = await res.json();
      setIsPublic(Boolean(json.isPublic));
      setShareUrl(json.shareUrl ?? null);
      showToast(enabled ? 'Your wrap snapshot is now public.' : 'Your wrap snapshot is now private.', 'success');
    } catch (err) {
      reportError(err, { scope: 'wrap.shareToggle', year });
      showToast('Could not update sharing settings. Please try again.', 'error');
    } finally {
      setShareLoading(false);
    }
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Link copied to clipboard!', 'success');
    } catch (err) {
      reportError(err, { scope: 'wrap.clipboard' });
      showToast('Could not copy the link.', 'error');
    }
  };

  return (
    <div className={`relative min-h-screen overflow-hidden transition-colors duration-1000 ${theme.bg}`}>
      {showConfetti && !prefersReducedMotion && <Confetti numberOfPieces={400} recycle={false} gravity={0.1} />}

      {/* Refresh control + last-updated timestamp */}
      <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-black/70 backdrop-blur-2xl border border-white/10 rounded-full px-4 py-2.5 shadow-2xl">
        <button
          onClick={refreshWrap}
          disabled={refreshing}
          className="text-sm font-bold text-white hover:text-[#1DB954] transition-colors focus:outline-none disabled:opacity-50"
        >
          {refreshing ? 'Refreshing…' : '↻ Refresh'}
        </button>
        <span className="text-xs text-gray-400" title="Last generated">
          {formatGeneratedAt(generatedAt)}
        </span>
      </div>

      <Swiper
        direction="vertical"
        pagination={{ clickable: true, dynamicBullets: true }}
        modules={[Pagination, Autoplay, EffectFade]}
        autoplay={prefersReducedMotion ? false : { delay: 8000, disableOnInteraction: true }}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        speed={prefersReducedMotion ? 0 : 1200}
        className="h-screen"
        onSlideChange={handleSlideChange}
      >
        {/* Slide 0: Intro */}
        <SwiperSlide className="flex items-center justify-center">
          <motion.div initial={{ opacity: 0, y: 80 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.4 }} className="text-center px-8">
            <h1 className={`text-6xl md:text-8xl font-black bg-clip-text text-transparent bg-gradient-to-r ${currentTheme === 'minimal' ? 'from-zinc-900 to-zinc-500' : 'from-white via-purple-300 to-indigo-300'} tracking-tighter mb-6`}>
              OmniWrap {year}
            </h1>
            <p className={`text-2xl md:text-3xl font-light ${theme.text}`}>Your digital year, unified.</p>
          </motion.div>
        </SwiperSlide>

        {/* Slide 1: Ready? */}
        <SwiperSlide className="flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
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

        {/* Slide 2: Spotify */}
        {data.spotify && (
          <SwiperSlide className="flex items-center justify-center">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={`w-full max-w-4xl p-12 rounded-3xl border shadow-2xl mx-4 backdrop-blur-xl ${theme.card} ${theme.text}`}>
              <h2 className={`text-5xl font-black mb-10 text-center ${theme.accent}`}>Music Vibes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-center md:text-left">
                <div>
                  <p className="text-xl uppercase tracking-widest opacity-60">Top Artist</p>
                  <p className="text-4xl font-black mt-2">{data.spotify.topArtist}</p>
                  <p className="text-xl mt-4 opacity-60">Top Track: {data.spotify.topSong}</p>
                </div>
                <div className="flex flex-col justify-center items-center md:items-end">
                  <p className="text-6xl font-black">{Math.round(data.spotify.minutes / 60)}</p>
                  <p className="text-xl uppercase tracking-widest opacity-60">Hours Listened</p>
                  {data.spotify.minutesNote && (
                    <p className="text-sm opacity-70 mt-2 italic">{data.spotify.minutesNote}</p>
                  )}
                </div>
              </div>
            </motion.div>
          </SwiperSlide>
        )}

        {/* Slide 3: YouTube */}
        {data.google && (
          <SwiperSlide className="flex items-center justify-center">
            <motion.div initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} className={`w-full max-w-4xl p-12 rounded-3xl border shadow-2xl mx-4 backdrop-blur-xl ${theme.card} ${theme.text}`}>
              <h2 className={`text-5xl font-black mb-10 text-center text-[#FF0000]`}>Watching Habits</h2>
              <div className="text-center">
                <p className="text-xl uppercase tracking-widest opacity-60">Most Watched</p>
                <p className="text-3xl font-black mt-4 px-6 italic">&quot;{data.google.topVideo}&quot;</p>
                <div className="mt-12 p-6 bg-white/5 rounded-2xl">
                  <p className="text-5xl font-black">{data.google.watchHours} hrs</p>
                  <p className="text-lg opacity-60">Spent on YouTube</p>
                  {data.google.watchHoursNote && (
                    <p className="text-sm opacity-70 mt-2 italic">{data.google.watchHoursNote}</p>
                  )}
                </div>
              </div>
            </motion.div>
          </SwiperSlide>
        )}

        {/* Slide 4: GitHub */}
        {data.github && (
          <SwiperSlide className="flex items-center justify-center">
            <motion.div initial={{ opacity: 0, rotateY: 90 }} animate={{ opacity: 1, rotateY: 0 }} className={`w-full max-w-4xl p-12 rounded-3xl border shadow-2xl mx-4 backdrop-blur-xl ${theme.card} ${theme.text}`}>
              <h2 className={`text-5xl font-black mb-10 text-center text-[#6F42C1]`}>Code Journey</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white/5 p-8 rounded-2xl text-center">
                  <p className="text-6xl font-black">{data.github.commits}</p>
                  <p className="text-xl opacity-60">Total Commits</p>
                </div>
                <div className="bg-white/5 p-8 rounded-2xl">
                  <p className="text-xl opacity-60 mb-4">Top Repository</p>
                  <p className="text-2xl font-bold truncate">{data.github.topRepo}</p>
                  <div className="flex gap-2 mt-6 flex-wrap">
                    {data.github.languages?.map((l: string) => (
                      <span key={l} className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold">{l}</span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </SwiperSlide>
        )}

        {/* Slide 5: Strava */}
        {data.strava && (
          <SwiperSlide className="flex items-center justify-center">
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className={`w-full max-w-4xl p-12 rounded-3xl border shadow-2xl mx-4 backdrop-blur-xl ${theme.card} ${theme.text}`}>
              <h2 className={`text-5xl font-black mb-10 text-center text-[#FC4C02]`}>Active Lifestyle</h2>
              <div className="flex flex-col items-center text-center">
                <div className="w-32 h-32 rounded-full border-4 border-[#FC4C02] flex items-center justify-center mb-6">
                  <span className="text-4xl">🏃</span>
                </div>
                <p className="text-6xl font-black">{data.strava.distanceKm} km</p>
                <p className="text-xl opacity-60 mt-2">Conquered in {year}</p>
                <p className="text-2xl font-bold mt-8 text-white/80">{data.strava.activities} Sessions across the year</p>
              </div>
            </motion.div>
          </SwiperSlide>
        )}

        {/* Slide 6: Duolingo */}
        {data.duolingo && (
          <SwiperSlide className="flex items-center justify-center">
            <motion.div initial={{ opacity: 0, scale: 1.2 }} animate={{ opacity: 1, scale: 1 }} className={`w-full max-w-4xl p-12 rounded-3xl border shadow-2xl mx-4 backdrop-blur-xl ${theme.card} ${theme.text}`}>
              <h2 className={`text-5xl font-black mb-10 text-center text-[#58CC02]`}>Daily Streak</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 text-center py-10 bg-[#58CC02]/10 rounded-2xl border border-[#58CC02]/20">
                  <p className="text-8xl font-black text-[#58CC02]">{data.duolingo.streakDays}</p>
                  <p className="text-2xl font-bold">DAYS STREAK!</p>
                </div>
                <div className="text-center p-6 bg-white/5 rounded-2xl">
                  <p className="text-3xl font-black">{data.duolingo.xp}</p>
                  <p className="opacity-60">Total XP</p>
                </div>
                <div className="text-center p-6 bg-white/5 rounded-2xl">
                  <p className="text-3xl font-black">{data.duolingo.language}</p>
                  <p className="opacity-60">Language</p>
                </div>
              </div>
            </motion.div>
          </SwiperSlide>
        )}

        {/* Slide 6.5: Reconnect CTA for failed providers */}
        {failedProviders.length > 0 && (
          <SwiperSlide className="flex items-center justify-center">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={`w-full max-w-4xl p-12 rounded-3xl border shadow-2xl mx-4 backdrop-blur-xl ${theme.card} ${theme.text}`}>
              <h2 className="text-4xl font-black mb-8 text-center text-yellow-400">Some Services Need Attention</h2>
              <p className="text-lg opacity-60 text-center mb-8">Reconnect to include their data in your wrap:</p>
              <div className="flex flex-col gap-4">
                {failedProviders.map(([provider, status]) => (
                  <div key={provider} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.chart }} />
                      <span className="font-bold">{PROVIDER_LABELS[provider] ?? provider}</span>
                      <span className="text-sm opacity-75">{status.message || status.error}</span>
                    </div>
                    <Link href="/dashboard">
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

        {/* Slide 7: The Legend (Aggregated) */}
        <SwiperSlide className="flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={`w-full max-w-5xl p-12 rounded-3xl border shadow-2xl mx-4 backdrop-blur-xl ${theme.card} ${theme.text} text-center`}>
            <h2 className={`text-6xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-purple-500 to-red-500`}>YOU ARE A LEGEND</h2>
            <p className="text-3xl mb-12">
              Total Tracked Time: <span className="font-black text-white">{data.aggregated?.totalHours || 0} Hours</span>
            </p>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" hide />
                  <Tooltip contentStyle={{ background: '#000', border: 'none', borderRadius: '8px' }} />
                  <Bar dataKey="hours" fill={theme.chart} radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xl opacity-60">
                Time-based data (music/video) wasn&apos;t available — your other stats are on the slides above.
              </p>
            )}
            <p className="mt-10 text-xl opacity-60">You&apos;ve mastered the digital realm in {year}.</p>
          </motion.div>
        </SwiperSlide>

        {/* Slide 8: Share */}
        <SwiperSlide className="flex flex-col items-center justify-center overflow-y-auto pt-20 pb-10">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-8 w-full max-w-4xl px-4">
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
            </div>

            <div ref={shareCardRef} className={`relative w-full max-w-sm ${exportFormats[exportFormat].aspect} ${exportFormats[exportFormat].padding} rounded-3xl flex flex-col border-4 shadow-2xl ${theme.bg} ${theme.card} ${theme.text} ${includeWatermark ? 'pb-14' : ''}`} style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <div>
                <h3 className={`text-4xl font-black mb-2 ${theme.accent}`}>OmniWrap {year}</h3>
                <p className="opacity-70 text-lg italic">My Digital Legacy</p>
              </div>
              <div className="space-y-4 flex-1 flex flex-col justify-center">
                <div className="flex justify-between border-b border-white/10 pb-2"><span>Tracked Time</span><span className="font-black">{data.aggregated?.totalHours || 0}h</span></div>
                <div className="flex justify-between border-b border-white/10 pb-2"><span>Code Commits</span><span className="font-black">{data.github?.commits || 0}</span></div>
                <div className="flex justify-between border-b border-white/10 pb-2"><span>Fitness</span><span className="font-black">{data.strava?.distanceKm || 0}km</span></div>
                <div className="flex justify-between border-b border-white/10 pb-2"><span>Top Track</span><span className="font-black truncate max-w-[100px]">{data.spotify?.topSong || 'N/A'}</span></div>
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
                Anyone with the link sees a limited snapshot (hours, top track, commits, distance, streak) — no account details.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
              <button onClick={downloadShareCard} className={`flex-1 max-w-xs px-10 py-4 text-xl font-black rounded-full shadow-xl transition-all hover:scale-105 ${currentTheme === 'minimal' ? 'bg-black text-white' : 'bg-white text-black'}`}>
                Download Image
              </button>

              <button
                onClick={() => {
                  const text = `Check out my ${year} OmniWrap! I spent ${data.aggregated?.totalHours || 0} hours across my digital life. Generate yours at omniwrap.com 🔥 #OmniWrap${year}`;
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