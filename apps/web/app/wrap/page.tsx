'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/pagination';
import { Pagination, Autoplay, EffectFade } from 'swiper/modules';
import Confetti from 'react-confetti';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import * as htmlToImage from 'html-to-image';
import Link from 'next/link';

const musicTracks = [
  { name: 'Neon Pulse', url: 'https://cdn.pixabay.com/download/audio/2022/11/10/audio_3c4d5e6f7g.mp3?filename=cyberpunk-2099-130007.mp3' },
  { name: 'Chill Synth', url: 'https://cdn.pixabay.com/download/audio/2023/02/28/audio_8b7d9f8c8a.mp3?filename=lofi-hip-hop-130006.mp3' },
  { name: 'Epic Beat', url: 'https://cdn.pixabay.com/download/audio/2024/01/15/audio_7f8c9d0e1b.mp3?filename=epic-cinematic-trailer-129846.mp3' },
];

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
  }
};

export default function Wrap() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<keyof typeof themes>('default');
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const theme = themes[currentTheme];

  useEffect(() => {
    async function fetchWrap() {
      try {
        const res = await fetch('/api/wrap');
        if (!res.ok) throw new Error('Failed to fetch wrap');
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error('Wrap Fetch Error:', err);
        setError('Could not load your 2025 Wrap. Make sure you are logged in and have connected at least one service!');
      } finally {
        setLoading(false);
      }
    }
    fetchWrap();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="w-16 h-16 border-4 border-[#1DB954] border-t-transparent rounded-full mb-6" />
        <p className="text-xl font-medium text-gray-400 animate-pulse">Aggregating your digital year...</p>
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

  const chartData = [
    { name: 'Spotify', hours: (data.spotify?.minutes || 0) / 60 },
    { name: 'YouTube', hours: data.google?.watchHours || 0 },
    { name: 'Strava', hours: (data.strava?.distanceKm || 0) / 10 },
    { name: 'GitHub', hours: (data.github?.commits || 0) / 20 },
  ].filter(d => d.hours > 0);

  const handleSlideChange = (swiper: any) => {
    if (swiper.activeIndex === 7) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 8000);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch((e) => console.log('Playback error:', e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const changeTrack = (index: number) => {
    if (audioRef.current) {
      setCurrentTrack(index);
      audioRef.current.src = musicTracks[index].url;
      if (isPlaying) {
        audioRef.current.play();
      }
    }
  };

  const downloadShareCard = async () => {
    if (shareCardRef.current) {
      try {
        const dataUrl = await htmlToImage.toPng(shareCardRef.current);
        const link = document.createElement('a');
        link.download = `omniwrap-2025-${currentTheme}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Could not generate image', err);
      }
    }
  };

  return (
    <div className={`relative min-h-screen overflow-hidden transition-colors duration-1000 ${theme.bg}`}>
      {showConfetti && <Confetti numberOfPieces={400} recycle={false} gravity={0.1} />}

      {/* Floating Music Player */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4 bg-black/70 backdrop-blur-2xl border border-white/10 rounded-full px-6 py-4 shadow-2xl">
        <button onClick={togglePlay} className="text-2xl text-white hover:text-[#1DB954] transition-colors focus:outline-none">
          {isPlaying ? '⏸' : '▶️'}
        </button>
        <span className="text-sm font-medium text-gray-200 min-w-[140px] text-center truncate max-w-[150px]">
          {musicTracks[currentTrack].name}
        </span>
        <div className="flex gap-3">
          {musicTracks.map((track, idx) => (
            <button key={idx} onClick={() => changeTrack(idx)} className={`w-4 h-4 rounded-full transition-all duration-300 ${currentTrack === idx ? 'bg-[#1DB954] scale-125 shadow-[0_0_12px_#1DB954]' : 'bg-gray-600 hover:bg-gray-400'}`} />
          ))}
        </div>
        <audio ref={audioRef} src={musicTracks[0].url} loop />
      </div>

      <Swiper
        direction="vertical"
        pagination={{ clickable: true, dynamicBullets: true }}
        modules={[Pagination, Autoplay, EffectFade]}
        autoplay={{ delay: 8000, disableOnInteraction: true }}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        speed={1200}
        className="h-screen"
        onSlideChange={handleSlideChange}
      >
        {/* Slide 0: Intro */}
        <SwiperSlide className="flex items-center justify-center">
          <motion.div initial={{ opacity: 0, y: 80 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.4 }} className="text-center px-8">
            <h1 className={`text-6xl md:text-8xl font-black bg-clip-text text-transparent bg-gradient-to-r ${currentTheme === 'minimal' ? 'from-zinc-900 to-zinc-500' : 'from-white via-purple-300 to-indigo-300'} tracking-tighter mb-6`}>
              OmniWrap 2025
            </h1>
            <p className={`text-2xl md:text-3xl font-light ${theme.text}`}>Your digital year, unified.</p>
          </motion.div>
        </SwiperSlide>

        {/* Slide 1: Ready? */}
        <SwiperSlide className="flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <h2 className={`text-7xl md:text-9xl font-black mb-8 ${theme.text}`}>READY?</h2>
            <div className="flex justify-center gap-4">
               {[1, 2, 3].map(i => (
                 <motion.div key={i} animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 2, delay: i * 0.4 }} className={`w-4 h-4 rounded-full ${currentTheme === 'minimal' ? 'bg-zinc-800' : 'bg-white'}`} />
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
                <p className="text-3xl font-black mt-4 px-6 italic">"{data.google.topVideo}"</p>
                <div className="mt-12 p-6 bg-white/5 rounded-2xl">
                  <p className="text-5xl font-black">{data.google.watchHours} hrs</p>
                  <p className="text-lg opacity-60">Spent on YouTube</p>
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
                <p className="text-xl opacity-60 mt-2">Conquered in 2025</p>
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

        {/* Slide 7: The Legend (Aggregated) */}
        <SwiperSlide className="flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={`w-full max-w-5xl p-12 rounded-3xl border shadow-2xl mx-4 backdrop-blur-xl ${theme.card} ${theme.text} text-center`}>
            <h2 className={`text-6xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-purple-500 to-red-500`}>YOU ARE A LEGEND</h2>
            <p className="text-3xl mb-12">Total Connected Time: <span className="font-black text-white">{data.aggregated?.totalHours || 0} Hours</span></p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" hide />
                <Tooltip contentStyle={{ background: '#000', border: 'none', borderRadius: '8px' }} />
                <Bar dataKey="hours" fill={theme.chart} radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-10 text-xl opacity-60">You've mastered the digital realm in 2025.</p>
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
            <div ref={shareCardRef} className={`relative w-full max-w-sm aspect-[4/5] p-10 rounded-3xl flex flex-col justify-between border-4 shadow-2xl ${theme.bg} ${theme.card} ${theme.text}`} style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <div>
                <h3 className={`text-4xl font-black mb-2 ${theme.accent}`}>OmniWrap 2025</h3>
                <p className="opacity-70 text-lg italic">My Digital Legacy</p>
              </div>
              <div className="space-y-4">
                 <div className="flex justify-between border-b border-white/10 pb-2"><span>Total Activity</span><span className="font-black">{data.aggregated?.totalHours || 0}h</span></div>
                 <div className="flex justify-between border-b border-white/10 pb-2"><span>Code Commits</span><span className="font-black">{data.github?.commits || 0}</span></div>
                 <div className="flex justify-between border-b border-white/10 pb-2"><span>Fitness</span><span className="font-black">{data.strava?.distanceKm || 0}km</span></div>
                 <div className="flex justify-between border-b border-white/10 pb-2"><span>Top Track</span><span className="font-black truncate max-w-[100px]">{data.spotify?.topSong || 'N/A'}</span></div>
              </div>
              <div className="text-center pt-4"><p className="text-xs opacity-50">GENERATE YOURS AT OMNIWRAP.COM</p></div>
            </div>
            <button onClick={downloadShareCard} className={`px-10 py-4 text-xl font-black rounded-full shadow-xl transition-all hover:scale-105 ${currentTheme === 'minimal' ? 'bg-black text-white' : 'bg-white text-black'}`}>
              Download Image
            </button>
          </motion.div>
        </SwiperSlide>

      </Swiper>
    </div>
  );
}
