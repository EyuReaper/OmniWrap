import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';
import { GITHUB_REPO_URL } from '@/lib/site';

export const metadata: Metadata = { title: 'Support' };

export default function SupportPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <main className="flex-1 max-w-3xl mx-auto px-6 py-16 md:py-24">
        <Link href="/" className="text-sm text-text-muted hover:text-foreground transition-colors">
          ← Back home
        </Link>
        <h1 className="text-4xl font-black mt-6 mb-8">Support</h1>
        <div className="space-y-6 text-text-muted leading-relaxed">
          <p>
            Running into a connection error, a missing service, or a bug in your wrap? The
            fastest way to get help is to open an issue on GitHub with a description of what
            happened and, if possible, which service was affected.
          </p>
          <a
            href={`${GITHUB_REPO_URL}/issues/new`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 rounded-xl bg-[var(--spotify-green)] text-black font-bold hover:brightness-110 transition-all"
          >
            Open an issue on GitHub
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
}
