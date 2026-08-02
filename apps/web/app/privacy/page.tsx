import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <main className="flex-1 max-w-3xl mx-auto px-6 py-16 md:py-24">
        <Link href="/" className="text-sm text-text-muted hover:text-foreground transition-colors">
          ← Back home
        </Link>
        <h1 className="text-4xl font-black mt-6 mb-8">Privacy Policy</h1>
        <div className="space-y-6 text-text-muted leading-relaxed">
          <p>
            OmniWrap connects to third-party services (Spotify, YouTube/Google, GitHub, Strava,
            LinkedIn, and manually-linked services) that you explicitly authorize, in order to
            build your personal year-in-review.
          </p>
          <p>
            We only request the read access needed to aggregate the stats shown in your wrap.
            Access tokens are encrypted at rest and are never sold or shared with third parties
            for advertising purposes.
          </p>
          <p>
            You can revoke access at any time from the connected service&apos;s own settings page,
            or by contacting support to request account deletion.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
