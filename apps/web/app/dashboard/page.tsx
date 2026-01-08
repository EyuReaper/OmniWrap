'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Dashboard() {
  const { data: session } = useSession();

  const services = [
    { name: 'Spotify', provider: 'spotify', color: 'bg-[var(--spotify-green)] hover:bg-green-600' },
    { name: 'YouTube', provider: 'google', color: 'bg-[var(--youtube-red)] hover:bg-red-700' },
    { name: 'GitHub', provider: 'github', color: 'bg-[var(--github-purple)] hover:bg-purple-700' },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[var(--bg-dark)]">
      <motion.h1
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-5xl font-bold mb-12 text-center"
      >
        {session ? `Welcome back, ${session.user?.name || 'User'}!` : 'Your OmniWrap Dashboard'}
      </motion.h1>

      {session && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          onClick={() => signOut()}
          className="mb-8 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium"
        >
          Sign Out
        </motion.button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full">
        {services.map((service) => (
          <motion.div
            key={service.name}
            whileHover={{ scale: 1.05, rotate: 2 }}
            whileTap={{ scale: 0.98 }}
            className="bg-gray-800 p-8 rounded-xl shadow-2xl text-center border border-gray-700"
          >
            <h2 className="text-3xl font-bold mb-4">{service.name}</h2>
            <p className="text-gray-400 mb-6">Connect to fetch your 2025 data</p>
            <button
              onClick={() => signIn(service.provider)}
              className={`w-full px-6 py-4 ${service.color} text-black font-bold rounded-lg transition-all duration-200 shadow-md`}
            >
              Connect {service.name}
            </button>
          </motion.div>
        ))}
      </div>

      <Link href="/wrap">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="mt-16 px-10 py-5 bg-gradient-to-r from-[var(--spotify-green)] via-purple-600 to-[var(--youtube-red)] rounded-xl text-2xl font-bold shadow-lg"
        >
          Generate Your Wrap
        </motion.button>
      </Link>
    </div>
  );
}