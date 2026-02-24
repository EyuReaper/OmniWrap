'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';

export default function Dashboard() {
  const { data: session } = useSession();
  const [activeManualService, setActiveManualService] = useState<string | null>(null);
  const [duoUsername, setDuoUsername] = useState('');

  const handleConnect = (provider: string | null) => {
    if (!provider) return;
    
    if (provider === 'telegram' || provider === 'duolingo') {
      setActiveManualService(provider);
    } else {
      signIn(provider);
    }
  };

  const services = [
    {
      name: 'Spotify',
      provider: 'spotify',
      color: 'from-[#1DB954]/30 to-[#1ED760]/10',
      glow: 'shadow-[0_0_25px_#1DB95460]',
      icon: 'https://cdn-icons-png.flaticon.com/512/174/174872.png',
      accent: '#1DB954',
    },
    {
      name: 'YouTube',
      provider: 'google',
      color: 'from-[#FF0000]/30 to-[#FF3333]/10',
      glow: 'shadow-[0_0_25px_#FF000060]',
      icon: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png',
      accent: '#FF0000',
    },
    {
      name: 'GitHub',
      provider: 'github',
      color: 'from-[#6F42C1]/30 to-[#7C3AED]/10',
      glow: 'shadow-[0_0_25px_#6F42C180]',
      icon: 'https://cdn-icons-png.flaticon.com/512/25/25231.png',
      accent: '#6F42C1',
    },
    {
      name: 'Telegram',
      provider: 'telegram',
      color: 'from-[#0088CC]/30 to-[#229ED9]/10',
      glow: 'shadow-[0_0_25px_#0088CC60]',
      icon: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg',
      accent: '#0088CC',
    },
    {
      name: 'Duolingo',
      provider: 'duolingo',
      color: 'from-[#58CC02]/30 to-[#7ACF00]/10',
      glow: 'shadow-[0_0_25px_#58CC0260]',
      icon: 'https://design.duolingo.com/0ae09c1b67d1113e0ac1.svg',
      accent: '#58CC02',
    },
    {
      name: 'LinkedIn',
      provider: 'linkedin',
      color: 'from-[#0A66C2]/30 to-[#0077B5]/10',
      glow: 'shadow-[0_0_25px_#0A66C260]',
      icon: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png',
      accent: '#0A66C2',
    },
    {
      name: 'Letterboxd',
      provider: 'letterboxd',
      color: 'from-[#2C3440]/30 to-[#445566]/10',
      glow: 'shadow-[0_0_25px_#00A0E960]',
      icon: 'https://a.ltrbxd.com/logos/letterboxd-logo-v-neg-rgb.svg',
      accent: '#00A0E9',
    },
    {
      name: 'Strava',
      provider: 'strava',
      color: 'from-[#FC4C02]/30 to-[#FF6B3B]/10',
      glow: 'shadow-[0_0_25px_#FC4C0260]',
      icon: 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Strava_Logo.svg',
      accent: '#FC4C02',
    },
    {
      name: 'Coming Soon',
      provider: null,
      color: 'from-gray-700/30 to-gray-800/10',
      glow: 'shadow-[0_0_25px_rgba(255,255,255,0.1)]',
      icon: 'https://cdn-icons-png.flaticon.com/512/1828/1828884.png',
      accent: '#FFFFFF',
      isComingSoon: true,
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-black flex flex-col items-center justify-center p-6 md:p-10">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-indigo-950/10 to-purple-950/5" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center mb-10 md:mb-16"
      >
        <h1 className="text-5xl md:text-6xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-gray-200 to-gray-400 drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
          {session ? `Hey ${session.user?.name?.split(' ')[0]}!` : 'OmniWrap'}
        </h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-3 text-base md:text-lg text-gray-400 font-light"
        >
          Connect your 2025 digital world
        </motion.p>
      </motion.div>

      {/* Sign Out */}
      {session && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          onClick={() => signOut()}
          className="relative z-20 mb-10 md:mb-16 px-8 py-3 bg-gray-900/60 backdrop-blur-xl border border-red-500/30 text-red-300 rounded-full text-sm font-medium shadow-[0_0_20px_rgba(239,68,68,0.15)] hover:border-red-400 hover:text-white transition-all duration-300"
        >
          Sign Out
        </motion.button>
      )}

      {/* Service Cards Grid */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 w-full max-w-7xl">
        {services.map((service, index) => {
          if (service.isComingSoon) {
            return (
              <motion.div
                key={service.name}
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.9, delay: index * 0.08 + 0.3 }}
                className={`group relative overflow-hidden rounded-2xl p-6 md:p-7 backdrop-blur-xl bg-gradient-to-br ${service.color} border border-white/10 ${service.glow} transition-all duration-500 opacity-80`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/30 opacity-50 transition-opacity duration-700" />

                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="mb-5 relative">
                    <img
                      src={service.icon}
                      alt="Coming Soon"
                      className="w-14 h-14 md:w-16 md:h-16 drop-shadow-[0_0_12px_white] animate-pulse-slow"
                    />
                    <div className="absolute inset-0 bg-gradient-radial from-white/30 to-transparent rounded-full animate-pulse-slow opacity-50" />
                  </div>

                  <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-3">
                    {service.name}
                  </h2>

                  <p className="text-sm md:text-base text-gray-300 mb-6 opacity-90">
                    More exciting services on the way...
                  </p>

                  <div className="w-full py-3 px-5 bg-black/40 backdrop-blur-md border border-white/20 text-gray-400 font-semibold rounded-xl text-sm cursor-not-allowed opacity-70">
                    Unlocking Soon
                  </div>
                </div>
              </motion.div>
            );
          }

          return (
            <motion.div
              key={service.name}
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
                {/* Connected Badge */}
                {session?.user?.connections?.includes(service.provider) && (
                  <div className="absolute top-4 right-4 flex items-center gap-1 px-3 py-1 bg-green-600/70 backdrop-blur-md border border-green-400/30 text-white text-xs font-bold rounded-full shadow-md">
                    <span>Connected</span>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}

                <div className="mb-5">
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
                  Unlock your {service.name.toLowerCase()} highlights
                </p>

                <button
                  onClick={() => handleConnect(service.provider)}
                  className={`w-full py-3 px-5 bg-black/40 backdrop-blur-md border border-white/20 text-white font-semibold rounded-xl text-sm hover:bg-black/60 hover:border-[${service.accent}]/60 hover:text-[${service.accent}] transition-all duration-400 shadow-inner`}
                >
                  Connect {service.name}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Manual Connection Modal */}
      <AnimatePresence>
        {activeManualService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md p-8 bg-gray-900 border border-white/10 rounded-3xl shadow-2xl"
            >
              <button
                onClick={() => setActiveManualService(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="text-center">
                <h2 className="text-3xl font-black text-white mb-4">
                  Connect {activeManualService.charAt(0).toUpperCase() + activeManualService.slice(1)}
                </h2>

                {activeManualService === 'telegram' ? (
                  <div className="space-y-6">
                    <p className="text-gray-400 leading-relaxed">
                      To sync your social stats, send your unique ID to our bot on Telegram.
                    </p>
                    <div className="p-4 bg-black/40 rounded-2xl border border-blue-500/30">
                      <p className="text-xs text-blue-400 font-mono mb-2">TELEGRAM COMMAND</p>
                      <code className="text-xl font-black text-white">/link {session?.user?.id?.slice(0, 8) || 'XXXXXX'}</code>
                    </div>
                    <Link
                      href="https://t.me/OmniWrapBot"
                      target="_blank"
                      className="block w-full py-4 bg-[#0088CC] text-white font-bold rounded-2xl hover:bg-[#0077B5] transition-colors"
                    >
                      Open @OmniWrapBot
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <p className="text-gray-400 leading-relaxed">
                      Enter your Duolingo username to sync your learning streaks.
                    </p>
                    <input
                      type="text"
                      placeholder="@username"
                      value={duoUsername}
                      onChange={(e) => setDuoUsername(e.target.value)}
                      className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-[#58CC02]/50"
                    />
                    <button
                      onClick={() => {
                        console.log('Saved Duolingo username:', duoUsername);
                        setActiveManualService(null);
                        alert('Duolingo connection saved (Local only for MVP)');
                      }}
                      className="w-full py-4 bg-[#58CC02] text-white font-bold rounded-2xl hover:bg-[#4CAF00] transition-colors"
                    >
                      Save Username
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CTA */}
      <Link href="/wrap" className="relative z-20 mt-16 md:mt-20">
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9, duration: 1, ease: 'backOut' }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.96 }}
          className="relative px-12 py-5 text-xl md:text-2xl font-black text-white rounded-2xl overflow-hidden bg-gradient-to-r from-[#1DB954] via-[#9333EA] to-[#FF0000] shadow-[0_0_50px_rgba(29,185,84,0.4)] group"
        >
          <span className="relative z-10">Generate Your 2025 Wrap</span>
          <div className="absolute inset-0 bg-gradient-to-r from-[#1DB954]/30 via-[#9333EA]/30 to-[#FF0000]/30 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl" />
        </motion.button>
      </Link>
    </div>
  );
}