'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

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
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-lg w-full text-center bg-surface/80 backdrop-blur-xl border border-danger/30 rounded-3xl p-12 shadow-2xl"
      >
        <div className="mb-8">
          <span className="text-8xl" role="img" aria-label="Confused face">😕</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
          Oops! Authentication Error
        </h1>

        <p className="text-xl text-text-muted mb-10">
          {message}
        </p>

        <div className="space-y-4">
          <Button variant="danger" size="lg" onClick={() => router.back()} className="w-full !bg-danger/90 !text-white !border-transparent hover:!bg-danger">
            Go Back
          </Button>

          <Link href="/dashboard" className="block">
            <Button variant="secondary" size="lg" className="w-full">
              Return to Dashboard
            </Button>
          </Link>
        </div>

        <p className="mt-10 text-sm text-text-subtle">
          If the problem persists, <Link href="/support" className="underline hover:text-foreground">contact support</Link> or check your connection settings.
        </p>
      </motion.div>
    </div>
  );
}