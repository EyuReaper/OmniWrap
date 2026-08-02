import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';

export const metadata: Metadata = { title: 'Terms of Service' };

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <main className="flex-1 max-w-3xl mx-auto px-6 py-16 md:py-24">
        <Link href="/" className="text-sm text-text-muted hover:text-foreground transition-colors">
          ← Back home
        </Link>
        <h1 className="text-4xl font-black mt-6 mb-8">Terms of Service</h1>
        <div className="space-y-6 text-text-muted leading-relaxed">
          <p>
            OmniWrap is provided as-is for personal, non-commercial use to generate a shareable
            recap of your activity across connected services.
          </p>
          <p>
            You are responsible for the accounts you connect and for complying with each
            underlying service&apos;s own terms of use. OmniWrap is not affiliated with Spotify,
            YouTube, GitHub, Strava, LinkedIn, Duolingo, Telegram, or Letterboxd.
          </p>
          <p>
            Generated wraps and share cards are yours to download and post. We reserve the right
            to change or discontinue features at any time.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
