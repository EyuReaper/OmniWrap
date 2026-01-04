'use client';

import { motion } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/pagination';
import { Pagination, Autoplay } from 'swiper/modules';
import Confetti from 'react-confetti';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Dummy data for prototype
const dummyData = {
  spotify: { topSong: 'Song X', minutes: 12000 },
  youtube: { topVideo: 'Video Y', watchHours: 500 },
  github: { commits: 1000, topRepo: 'Repo Z' },
  aggregated: { totalHours: 1700 },
};

const chartData = [
  { name: 'Spotify', hours: dummyData.spotify.minutes / 60 },
  { name: 'YouTube', hours: dummyData.youtube.watchHours },
  { name: 'GitHub', hours: dummyData.github.commits / 10 }, // Arbitrary conversion
];

export default function Wrap() {
  const [showConfetti, setShowConfetti] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900">
      {showConfetti && <Confetti />}
      <Swiper
        direction="vertical"
        pagination={{ clickable: true }}
        modules={[Pagination, Autoplay]}
        autoplay={{ delay: 5000 }}
        className="h-screen"
      >
        <SwiperSlide className="flex items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-center"
          >
            <h1 className="text-6xl font-bold">Your 2025 OmniWrap</h1>
            <p className="text-2xl mt-4">Swipe to discover!</p>
          </motion.div>
        </SwiperSlide>
        <SwiperSlide className="flex items-center justify-center">
          <motion.div whileHover={{ scale: 1.1 }} className="bg-gray-800 p-8 rounded-lg">
            <h2 className="text-4xl font-bold mb-4 text-[var(--spotify-green)]">Spotify Highlights</h2>
            <p>Top Song: {dummyData.spotify.topSong}</p>
            <p>Minutes Listened: {dummyData.spotify.minutes}</p>
            <button onClick={() => setShowConfetti(true)} className="mt-4 px-4 py-2 bg-[var(--spotify-green)] rounded">
              Celebrate!
            </button>
          </motion.div>
        </SwiperSlide>
        <SwiperSlide className="flex items-center justify-center">
          <motion.div whileHover={{ scale: 1.1 }} className="bg-gray-800 p-8 rounded-lg">
            <h2 className="text-4xl font-bold mb-4 text-[var(--youtube-red)]">YouTube Highlights</h2>
            <p>Top Video: {dummyData.youtube.topVideo}</p>
            <p>Watch Hours: {dummyData.youtube.watchHours}</p>
          </motion.div>
        </SwiperSlide>
        <SwiperSlide className="flex items-center justify-center">
          <motion.div whileHover={{ scale: 1.1 }} className="bg-gray-800 p-8 rounded-lg">
            <h2 className="text-4xl font-bold mb-4 text-[var(--github-purple)]">GitHub Highlights</h2>
            <p>Commits: {dummyData.github.commits}</p>
            <p>Top Repo: {dummyData.github.topRepo}</p>
          </motion.div>
        </SwiperSlide>
        <SwiperSlide className="flex items-center justify-center">
          <div className="bg-gray-800 p-8 rounded-lg w-3/4">
            <h2 className="text-4xl font-bold mb-4">Unified Insights</h2>
            <p>Total Digital Hours: {dummyData.aggregated.totalHours}</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="hours" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SwiperSlide>
      </Swiper>
    </div>
  );
}