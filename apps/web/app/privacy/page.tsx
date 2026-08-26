import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <main className="flex-1 max-w-3xl mx-auto px-6 py-16 md:py-24">
        <Link href="/" className="text-sm text-text-muted hover:text-foreground transition-colors">
          &larr; Back home
        </Link>
        <h1 className="text-4xl font-black mt-6 mb-8">Privacy Policy</h1>
        <p className="text-sm text-text-muted mb-8">Last updated: August 26, 2026</p>

        <div className="space-y-8 text-text-muted leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">What OmniWrap does</h2>
            <p>
              OmniWrap is a personal year-in-review tool. It connects to third-party services you
              explicitly authorize (Spotify, YouTube/Google, GitHub, Strava, and optionally LinkedIn)
              to aggregate activity statistics into a shareable recap.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Data we access</h2>
            <p className="mb-3">
              When you connect a service, OmniWrap requests only the minimum read access needed to
              build your wrap:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Spotify:</strong> top tracks/artists, recently played (current user data only)</li>
              <li><strong>YouTube/Google:</strong> liked videos, channel stats (read-only)</li>
              <li><strong>GitHub:</strong> public repositories, commit activity (read-only)</li>
              <li><strong>Strava:</strong> activity summaries for the current year (read-only)</li>
              <li><strong>LinkedIn:</strong> profile info (sign-in only; no data fetcher implemented yet)</li>
            </ul>
            <p className="mt-3">
              We do <strong>not</strong> request write access, friend lists, private messages, or any
              permission beyond what is listed above.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">How we store your data</h2>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>
                <strong>OAuth tokens</strong> are encrypted at rest using AES-256-GCM before being
                stored in our database. They are used solely to fetch your stats when you generate or
                refresh a wrap.
              </li>
              <li>
                <strong>Generated wraps</strong> (aggregated statistics) are stored in our database so
                you can view and share them without re-fetching.
              </li>
              <li>
                <strong>Profile information</strong> (name, email, profile image) comes from your
                connected services and is used only for display within the app.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">What we do not do</h2>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>We do <strong>not</strong> sell your data to anyone.</li>
              <li>We do <strong>not</strong> share your data with third parties for advertising purposes.</li>
              <li>We do <strong>not</strong> use tracking cookies or analytics scripts.</li>
              <li>We do <strong>not</strong> use your data to train models or build profiles for targeted content.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Your rights</h2>
            <p className="mb-3">
              You have full control over your data:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>
                <strong>Access:</strong> Download a copy of all your data via the{' '}
                <strong>Account &rarr; Export Data</strong> option in the dashboard, or by contacting
                us.
              </li>
              <li>
                <strong>Deletion:</strong> Permanently delete your account and all associated data
                (connections, wraps, sessions) via <strong>Account &rarr; Delete Account</strong> in
                the dashboard. This action is irreversible.
              </li>
              <li>
                <strong>Disconnect:</strong> Disconnect any individual service at any time from the
                dashboard. This removes stored tokens and prevents future data fetching for that
                service.
              </li>
              <li>
                <strong>Revoke at source:</strong> You can also revoke OmniWrap&apos;s access directly
                from each service&apos;s own security/settings page (e.g., Spotify&apos;s App
                Permissions, GitHub&apos;s Authorized OAuth Apps).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Data retention</h2>
            <p>
              Your data is retained only as long as your account exists. When you delete your account,
              all associated data (tokens, wraps, sessions, connections) is permanently removed from
              our database. We do not keep backups of deleted accounts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Security</h2>
            <p>
              We use industry-standard practices to protect your data: encrypted token storage
              (AES-256-GCM), HTTPS for all communications, session-based authentication with
              secure cookies, and rate limiting on sensitive endpoints. However, no method of
              transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Children&apos;s privacy</h2>
            <p>
              OmniWrap is not directed at children under 13 (or the applicable age of digital consent
              in your jurisdiction). We do not knowingly collect data from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Changes to this policy</h2>
            <p>
              We may update this privacy policy from time to time. Changes will be posted on this
              page with an updated &ldquo;Last updated&rdquo; date. Continued use of OmniWrap after
              changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Contact</h2>
            <p>
              For questions about this privacy policy or your data, contact us at{' '}
              <Link href="/support" className="underline hover:text-foreground transition-colors">
                our support page
              </Link>.
            </p>
          </section>

          <section>
            <p className="text-sm italic">
              <strong>Note on regulatory compliance:</strong> We have designed OmniWrap with privacy
              best practices in mind and provide the data access, deletion, and portability features
              described above. However, we are a small project and have not completed a formal GDPR
              or CCPA compliance audit. If you have specific regulatory requirements, please contact
              us before using the service.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
