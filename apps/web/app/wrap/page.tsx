'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/pagination';
import { Pagination, Autoplay, EffectFade } from 'swiper/modules';
import Confetti from 'react-confetti';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Mock data (expand with real API later)
const mockData = {
  spotify: { topSong: 'Blinding Lights', topArtist: 'The Weeknd', minutes: 14520, topGenre: 'Synthwave' },
  youtube: { topVideo: 'MrBeast $1 vs $1,000,000 Hotel Room', watchHours: 680, topCategory: 'Entertainment' },
  github: { commits: 1247, topRepo: 'omniwrap-frontend', languages: ['TypeScript', 'Tailwind'] },
  appleMusic: { topSong: 'Levitating', minutes: 9800 },
  telegram: { messages: 4520, topChat: 'Family Group' },
  duolingo: { streakDays: 312, xp: 24500, language: 'Spanish' },
  linkedin: { connectionsAdded: 87, profileViews: 3200 },
  letterboxd: { moviesWatched: 92, topGenre: 'Horror' },
  strava: { distanceKm: 1450, activities: 210, topSport: 'Running' },
  aggregated: { totalHours: 3200, topCategory: 'Music' },
};

const chartData = [
  { name: 'Spotify', hours: mockData.spotify.minutes / 60 },
  { name: 'YouTube', hours: mockData.youtube.watchHours },
  { name: 'Apple Music', hours: mockData.appleMusic.minutes / 60 },
  { name: 'Strava', hours: mockData.strava.distanceKm / 10 },
  { name: 'GitHub', hours: mockData.github.commits / 20 },
];

// Mock music tracks (free/public domain or replace with your own)
const musicTracks = [
  { name: 'Neon Pulse', url: 'https://cdn.pixabay.com/download/audio/2022/11/10/audio_3c4d5e6f7g.mp3?filename=cyberpunk-2099-130007.mp3' },
  { name: 'Chill Synth', url: 'https://cdn.pixabay.com/download/audio/2023/02/28/audio_8b7d9f8c8a.mp3?filename=lofi-hip-hop-130006.mp3' },
  { name: 'Epic Beat', url: 'https://cdn.pixabay.com/download/audio/2024/01/15/audio_7f8c9d0e1b.mp3?filename=epic-cinematic-trailer-129846.mp3' },
];

export default function Wrap() {
  const [showConfetti, setShowConfetti] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleSlideChange = (swiper) => {
    // Trigger confetti on aggregated slide (index 3 in current setup)
    if (swiper.activeIndex === 3) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 6000);
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

  const changeTrack = (index) => {
    if (audioRef.current) {
      setCurrentTrack(index);
      audioRef.current.src = musicTracks[index].url;
      if (isPlaying) {
        audioRef.current.play();
      }
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-black via-gray-950 to-black">
      {/* Confetti */}
      {showConfetti && <Confetti numberOfPieces={400} recycle={false} gravity={0.1} />}

      {/* Floating Music Player - Bottom Right */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4 bg-black/70 backdrop-blur-2xl border border-white/10 rounded-full px-6 py-4 shadow-2xl">
        <button
          onClick={togglePlay}
          className="text-2xl text-white hover:text-[#1DB954] transition-colors focus:outline-none"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶️'}
        </button>

        <span className="text-sm font-medium text-gray-200 min-w-[140px] text-center">
          {musicTracks[currentTrack].name}
        </span>

        <div className="flex gap-3">
          {musicTracks.map((track, idx) => (
            <button
              key={idx}
              onClick={() => changeTrack(idx)}
              className={`w-4 h-4 rounded-full transition-all duration-300 ${
                currentTrack === idx
                  ? 'bg-[#1DB954] scale-125 shadow-[0_0_12px_#1DB954]'
                  : 'bg-gray-600 hover:bg-gray-400'
              }`}
              aria-label={`Select ${track.name}`}
            />
          ))}
        </div>

        {/* Hidden audio */}
        <audio
          ref={audioRef}
          src={musicTracks[0].url}
          loop
          onEnded={() => {
            const next = (currentTrack + 1) % musicTracks.length;
            changeTrack(next);
          }}
        />
      </div>

      <Swiper
        direction="vertical"
        pagination={{ clickable: true, dynamicBullets: true }}
        modules={[Pagination, Autoplay, EffectFade]}
        autoplay={{ delay: 7000, disableOnInteraction: true }}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        speed={1200}
        className="h-screen"
        onSlideChange={handleSlideChange}
      >
        {/* Intro Slide */}
        <SwiperSlide className="flex items-center justify-center bg-gradient-to-br from-indigo-950/20 to-purple-950/10">
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
            className="text-center px-8 max-w-4xl"
          >
            <h1 className="text-6xl md:text-8xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-300 to-indigo-300 tracking-tighter drop-shadow-2xl mb-6">
              Your 2025 OmniWrap
            </h1>
            <p className="text-xl md:text-3xl text-gray-300 font-light opacity-90">
              One swipe. Your entire digital year.
            </p>
          </motion.div>
        </SwiperSlide>

        {/* Spotify Slide */}
        <SwiperSlide className="flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="w-full max-w-5xl p-8 md:p-16 backdrop-blur-2xl bg-black/50 rounded-3xl border border-[#1DB954]/30 shadow-[0_0_60px_rgba(29,185,84,0.35)] mx-4 md:mx-8"
          >
            <h2 className="text-5xl md:text-6xl font-black text-[#1DB954] mb-10 text-center drop-shadow-lg">
              Spotify Wrapped Vibes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-gray-200 text-center md:text-left">
              <div>
                <p className="text-2xl font-bold">Top Song</p>
                <p className="text-3xl mt-2 font-semibold">{mockData.spotify.topSong}</p>
                <p className="text-xl mt-1 text-gray-400">by {mockData.spotify.topArtist}</p>
              </div>
              <div>
                <p className="text-2xl font-bold">Listening Time</p>
                <p className="text-3xl mt-2 font-semibold">{Math.round(mockData.spotify.minutes / 60)} hours</p>
                <p className="text-xl mt-1 text-gray-400">Top Genre: {mockData.spotify.topGenre}</p>
              </div>
            </div>
          </motion.div>
        </SwiperSlide>

        {/* YouTube Slide */}
        <SwiperSlide className="flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="w-full max-w-5xl p-8 md:p-16 backdrop-blur-2xl bg-black/50 rounded-3xl border border-[#FF0000]/30 shadow-[0_0_60px_rgba(255,0,0,0.35)] mx-4 md:mx-8"
          >
            <h2 className="text-5xl md:text-6xl font-black text-[#FF0000] mb-10 text-center drop-shadow-lg">
              YouTube Recap
            </h2>
            <div className="text-center text-gray-200">
              <p className="text-2xl font-bold">Top Video</p>
              <p className="text-3xl mt-2 font-semibold">{mockData.youtube.topVideo}</p>
              <p className="text-3xl mt-8 font-bold">Watch Time</p>
              <p className="text-4xl mt-2">{mockData.youtube.watchHours} hours</p>
              <p className="text-xl mt-3 text-gray-400">Category: {mockData.youtube.topCategory}</p>
            </div>
          </motion.div>
        </SwiperSlide>

        {/* Aggregated Insights Slide */}
        <SwiperSlide className="flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="w-full max-w-5xl p-8 md:p-16 backdrop-blur-2xl bg-black/50 rounded-3xl border border-purple-500/30 shadow-[0_0_60px_rgba(147,51,234,0.4)] mx-4 md:mx-8"
          >
            <h2 className="text-5xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-purple-500 to-red-500 mb-10 text-center drop-shadow-lg">
              Your Digital Universe
            </h2>
            <p className="text-4xl font-bold text-center text-white mb-10">
              Total Time Spent: {mockData.aggregated.totalHours} hours
            </p>
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.85} />
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0.35} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#aaa" tick={{ fill: '#ccc' }} />
                <YAxis stroke="#aaa" tick={{ fill: '#ccc' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid #444', borderRadius: '12px', color: '#fff' }}
                />
                <Bar dataKey="hours" fill="url(#colorBar)" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xl text-center text-gray-400 mt-10 opacity-90">
              Your year in pixels, beats, commits, and beyond
            </p>
          </motion.div>
        </SwiperSlide>

        {/* Add more slides here as needed */}
      </Swiper>
    </div>
  );
}