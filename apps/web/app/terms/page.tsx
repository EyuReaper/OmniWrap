import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';

export const metadata: Metadata = { title: 'Terms of Service' };

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <main className="flex-1 max-w-3xl mx-auto px-6 py-16 md:py-24">
        <Link href="/" className="text-sm text-text-muted hover:text-foreground transition-colors">
          &larr; Back home
        </Link>
        <h1 className="text-4xl font-black mt-6 mb-8">Terms of Service</h1>
        <p className="text-sm text-text-muted mb-8">Last updated: August 26, 2026</p>

        <div className="space-y-8 text-text-muted leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Acceptance of terms</h2>
            <p>
              By accessing or using OmniWrap (&ldquo;the Service&rdquo;), you agree to be bound by
              these Terms of Service. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Description of service</h2>
            <p>
              OmniWrap is a personal year-in-review tool that connects to third-party services you
              authorize (Spotify, YouTube/Google, GitHub, Strava, and optionally LinkedIn) to
              aggregate your activity statistics into a shareable recap. The Service is provided
              as-is for personal, non-commercial use.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Your accounts</h2>
            <p>
              You are responsible for the third-party accounts you connect to OmniWrap and for
              complying with each service&apos;s own terms of use. OmniWrap is not affiliated with
              Spotify, YouTube, Google, GitHub, Strava, LinkedIn, or any other third-party service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Data and privacy</h2>
            <p>
              Your use of the Service is also governed by our{' '}
              <Link href="/privacy" className="underline hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              , which describes how we collect, use, store, and delete your data. By using the
              Service, you consent to the data practices described there.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">User content</h2>
            <p>
              Generated wraps, share cards, and any content you create using the Service are yours.
              You may download, share, and repost them freely. We do not claim ownership of your
              generated content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Prohibited uses</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to other users&apos; accounts or data</li>
              <li>Abuse the API through excessive automated requests or rate-limit circumvention</li>
              <li>Redistribute or resell the Service or its outputs commercially</li>
              <li>Use the Service to harass, harm, or impersonate others</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Availability and modifications</h2>
            <p>
              We reserve the right to modify, suspend, or discontinue the Service (or any part of
              it) at any time, with or without notice. We are not liable for any interruption,
              suspension, or termination of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Disclaimer of warranties</h2>
            <p>
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without
              warranties of any kind, whether express or implied, including but not limited to
              implied warranties of merchantability, fitness for a particular purpose, and
              non-infringement. We do not warrant that the Service will be uninterrupted, error-free,
              or free of harmful components.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Limitation of liability</h2>
            <p>
              To the maximum extent permitted by applicable law, OmniWrap and its operators shall
              not be liable for any indirect, incidental, special, consequential, or punitive
              damages, or any loss of profits or revenues, whether incurred directly or indirectly,
              or any loss of data, use, goodwill, or other intangible losses resulting from your use
              of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Third-party services</h2>
            <p>
              The Service relies on third-party APIs (Spotify, Google, GitHub, Strava, LinkedIn) that
              may change, become unavailable, or restrict access without notice. We are not
              responsible for interruptions caused by third-party service changes. If a connected
              service becomes unavailable, the corresponding section of your wrap may show incomplete
              or missing data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Account deletion</h2>
            <p>
              You may delete your account at any time from the dashboard. Deletion is permanent and
              irreversible: all your data (connections, wraps, sessions) will be permanently removed.
              See the{' '}
              <Link href="/privacy" className="underline hover:text-foreground transition-colors">
                Privacy Policy
              </Link>{' '}
              for details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Changes to these terms</h2>
            <p>
              We may update these terms from time to time. Changes will be posted on this page with
              an updated &ldquo;Last updated&rdquo; date. Continued use of the Service after changes
              constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Governing law</h2>
            <p>
              These terms are governed by the laws of the jurisdiction in which the Service operator
              resides, without regard to conflict-of-law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Contact</h2>
            <p>
              For questions about these terms, contact us at{' '}
              <Link href="/support" className="underline hover:text-foreground transition-colors">
                our support page
              </Link>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
