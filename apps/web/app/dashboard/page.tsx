`use client`

import { motion } from 'framer-motion';
import Link from `next/link`;

export default function Dashboard() {
    return (
        <div className="min-h-screen flex flex-col item-center justify-center p-8">
            <motion.h1
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl font-bold mb-12">
                Your OmniWrap Dashboard
            </motion.h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {['Spotify', 'YouTube', "GitHub"].map((service) => (
                    <motion.div
                        key={service}
                        whileHover={{ scale: 1.05, rotate: 2 }}
                        className="bg-gray-800 p-6 rounded-lg shadow-lg cursor-pointer"
                    >
                        <h2 className="text-2xl font-semibold mb-4">{service}</h2>
                        <p>Connect to fetch your 2025 data</p>
                        {/**Placeholder for connect button - add auth later*/}
                        <button className="mt-4 px-4 py-2 bg-[var(--spotify-green)] text-black rounded">
                            Connect
                        </button>
                    </motion.div>

                ))}
            </div>
            <link href="/wrap">
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    className="mt-12 px-8 py-4 bg-gradient-to-r from -[var(--spotify-green)] to-[var(--spotify-green)] to-[var(--youtube-red)] rounded-lg text-xl font-bold"
                >
                    Generate your Wrap
                </motion.button>
            </link>
        </div>
    );
    
}