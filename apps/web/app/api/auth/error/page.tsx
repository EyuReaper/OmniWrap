'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function AuthError() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages = {
    Configuration: "There was a problem with the authentication configuration.",
    AccessDenied: "You do not have permission to sign in.",
    OAuthSignin: "Error signing in with the provider.",
    OAuthCallback: "Callback error from the provider (check redirect URI).",
    OAuthCreateAccount: "Could not create account with provider.",
    EmailCreateAccount: "Could not create account with email.",
    Callback: "Error during callback — try again.",
    OAuthAccountNotLinked: "Account is not linked — sign in with the original provider.",
    default: "An unexpected error occurred. Please try again.",
  };

  const message = errorMessages[error as keyof typeof errorMessages] || errorMessages.default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-lg w-full text-center bg-gray-900/70 backdrop-blur-xl border border-red-500/30 rounded-3xl p-12 shadow-2xl"
      >
        <div className="mb-8">
          <span className="text-8xl">😕</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">
          Oops! Authentication Error
        </h1>

        <p className="text-xl text-gray-300 mb-10">
          {message}
        </p>

        <div className="space-y-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.back()}
            className="w-full py-4 px-8 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all"
          >
            Go Back
          </motion.button>

          <Link href="/dashboard">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 px-8 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl border border-gray-600 transition-all"
            >
              Return to Dashboard
            </motion.button>
          </Link>
        </div>

        <p className="mt-10 text-sm text-gray-500">
          If the problem persists, contact support or check your connection settings.
        </p>
      </motion.div>
    </div>
  );
}