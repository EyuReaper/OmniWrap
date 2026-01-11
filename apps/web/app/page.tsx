'use client';  // ← Makes it client-only

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Home() {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Only run on client
    const width = window.innerWidth;
    const height = window.innerHeight;

    const newParticles = [...Array(50)].map((_, i) => ({
      key: i,
      left: `${Math.random() * 100}%`,
      initialX: Math.random() * width,
      initialY: height + 10,
      animateX: Math.random() * width,
    }));

    setParticles(newParticles);
  }, []);  // Empty array: run once on mount

  return (
    <div className="min-h-screen relative bg-black flex flex-col overflow-hidden">
      {/* Floating Particles Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="particles absolute inset-0 opacity-30">
          {particles.map((p) => (
            <motion.div
              key={p.key}
              className="absolute w-1 h-1 bg-white rounded-full"
              initial={{ x: p.initialX, y: p.initialY }}
              animate={{
                y: -10,
                x: p.animateX,
              }}
              transition={{
                duration: Math.random() * 20 + 20,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{ left: p.left }}
            />
          ))}
        </div>
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-black to-green-900/30 pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-20 px-8 py-6 flex justify-between items-center border-b border-white/10 backdrop-blur-md">
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--spotify-green)] to-[var(--youtube-red)]"
        >
          OmniWrap
        </motion.h2>
        <div className="flex gap-6">
          <Link href="/dashboard" className="text-gray-300 hover:text-white transition">Dashboard</Link>
          <Link href="/wrap" className="text-gray-300 hover:text-white transition">View Wrap</Link>
        </div>
      </nav>

      {/* Main Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-6xl md:text-8xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[var(--spotify-green)] via-white to-[var(--youtube-red)] drop-shadow-2xl"
        >
          OmniWrap 2025
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xl md:text-3xl text-gray-300 mb-12 max-w-3xl"
        >
          Your unified year-in-review: Spotify, YouTube, GitHub, and more — all in one stunning recap.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1 }}
          className="flex flex-col sm:flex-row gap-6"
        >
          <Link href="/dashboard">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 50px rgba(29, 185, 84, 0.8)' }}
              whileTap={{ scale: 0.95 }}
              className="px-12 py-6 text-2xl font-bold text-black bg-[var(--spotify-green)] rounded-full shadow-2xl"
            >
              Get Started Now
            </motion.button>
          </Link>
          <Link href="/wrap">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 50px rgba(255, 0, 0, 0.8)' }}
              whileTap={{ scale: 0.95 }}
              className="px-12 py-6 text-2xl font-bold text-white border-3 border-[var(--youtube-red)] rounded-full backdrop-blur-md bg-white/10"
            >
              Preview Demo
            </motion.button>
          </Link>
        </motion.div>
      </main>

      {/* Enhanced Footer */}
      <footer className="relative z-10 py-10 border-t border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="container mx-auto px-8 text-center">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="text-gray-400 text-lg"
          >
            © 2026 Made with 🔥 by
            <a
              href="https://x.com/EyuReaper"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-white hover:text-[var(--spotify-green)] transition-all duration-300 hover:drop-shadow-glow"
            >
              EyuReaper
            </a>
          </motion.p>
        </div>
      </footer>
    </div>
  );
}