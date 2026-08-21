// Server Component: everything here is static marketing copy, so it renders to
// HTML with no client bundle beyond the small <Reveal> entrance-animation island.
import Link from 'next/link';
import Footer from '@/components/Footer';
import Reveal from '@/components/motion/Reveal';
import { getWrapYear } from '@/lib/wrapYear';

const steps = [
  {
    title: 'Connect',
    description: 'Sign in and link Spotify, YouTube, GitHub, or Strava in a few clicks.',
  },
  {
    title: 'We aggregate',
    description: 'Your stats are pulled together and your tokens are encrypted at rest.',
  },
  {
    title: 'Get your wrap',
    description: 'A shareable, animated recap of your year — ready to post.',
  },
];

const trustPoints = [
  { label: 'Encrypted at rest', description: 'Access tokens are AES-256 encrypted, never stored in plain text.' },
  { label: 'We never sell your data', description: 'No advertising, no third-party data sharing. Ever.' },
  { label: 'Disconnect anytime', description: 'Revoke access from the provider or delete your account in one step.' },
];

const services = [
  {
    name: 'Spotify',
    color: 'var(--spotify-green)',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.6 14.4c-.2.3-.6.4-.9.2-2.5-1.5-5.6-1.9-9.3-1-.4.1-.7-.1-.8-.5-.1-.4.1-.7.5-.8 4-.9 7.5-.5 10.3 1.2.3.2.4.6.2.9zm1.2-2.7c-.2.4-.7.5-1.1.3-2.9-1.8-7.3-2.3-10.7-1.3-.4.1-.9-.1-1-.5-.1-.4.1-.9.5-1 3.9-1.2 8.7-.6 12 1.4.4.2.5.7.3 1.1zm.1-2.8C14.6 9 8.9 8.8 5.7 9.8c-.5.2-1.1-.1-1.3-.6-.2-.5.1-1.1.6-1.3 3.7-1.1 10-.9 13.9 1.4.5.3.6.9.4 1.4-.3.4-.9.6-1.4.3z"/></svg>
    ),
  },
  {
    name: 'YouTube',
    color: 'var(--youtube-red)',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.6 7.2s-.2-1.5-.8-2.2c-.8-.9-1.7-.9-2.1-1C15.9 3.8 12 3.8 12 3.8h0s-3.9 0-6.7.2c-.4 0-1.3.1-2.1 1-.6.7-.8 2.2-.8 2.2S2.2 9 2.2 10.7v1.6c0 1.7.2 3.5.2 3.5s.2 1.5.8 2.2c.8.9 1.9.9 2.4 1 1.7.2 7.4.2 7.4.2s3.9 0 6.7-.2c.4 0 1.3-.1 2.1-1 .6-.7.8-2.2.8-2.2s.2-1.7.2-3.5v-1.6c0-1.7-.2-3.5-.2-3.5zM9.9 14.6V8.9l5.4 2.9-5.4 2.8z"/></svg>
    ),
  },
  {
    name: 'GitHub',
    color: 'var(--github-purple)',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05a9.3 9.3 0 0 1 5 0c1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.79-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.26 10.26 0 0 0 22 12.25C22 6.58 17.52 2 12 2z"/></svg>
    ),
  },
  {
    name: 'Strava',
    color: 'var(--strava-orange)',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10.9 2 5.5 13.2h3.4l2-4 2 4h3.4L10.9 2Zm4.3 13.2-1.6 3.3-1.6-3.3H8.6l3 6.6h3.2l3-6.6h-3.6Z"/></svg>
    ),
  },
];

const sampleWrap = {
  totalHours: 342,
  topArtist: 'Tame Impala',
  commits: 1204,
  distanceKm: 186,
};

export default function Home() {
  return (
    <div className="min-h-screen relative bg-background text-foreground flex flex-col">
      {/* Gradient Overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-transparent to-green-900/10 dark:from-purple-900/20 dark:to-green-900/20 pointer-events-none"
        aria-hidden="true"
      />

      {/* Navbar */}
      <nav className="relative z-20 px-4 sm:px-8 py-6 flex justify-between items-center border-b border-border backdrop-blur-md">
        <h2 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--spotify-green)] to-[var(--youtube-red)]">
          OmniWrap
        </h2>
        <div className="flex gap-4 sm:gap-6">
          <Link href="/dashboard" className="text-text-muted hover:text-foreground transition-colors rounded-sm">Dashboard</Link>
          <Link href="/wrap" className="text-text-muted hover:text-foreground transition-colors rounded-sm">View Wrap</Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex flex-col items-center justify-center px-4 sm:px-8 py-14 sm:py-20 text-center">
        <Reveal variant="up">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-5 bg-clip-text text-transparent bg-gradient-to-r from-[var(--spotify-green)] via-foreground via-50% to-[var(--youtube-red)]">
            Your whole digital year, wrapped.
          </h1>
        </Reveal>

        <Reveal variant="fade" delay={0.2}>
          <p className="text-lg sm:text-xl text-text-muted mb-10 max-w-2xl">
            OmniWrap pulls together Spotify, YouTube, GitHub, and Strava into one shareable
            year-in-review. No spreadsheets, no manual digging — just connect and see it come together.
          </p>
        </Reveal>

        {/* CTA hierarchy: primary action vs. secondary/no-commitment action */}
        <Reveal
          variant="scale"
          delay={0.35}
          className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto max-w-sm sm:max-w-none mb-16 sm:mb-20"
        >
          <Link href="/dashboard">
            <button className="w-full px-8 sm:px-10 py-4 sm:py-5 text-lg sm:text-xl font-bold text-black bg-[var(--spotify-green)] rounded-full shadow-xl hover:brightness-110 hover:scale-105 active:scale-95 transition-all">
              Get your wrap
            </button>
          </Link>
          <a href="#sample-wrap">
            <button className="w-full px-8 sm:px-10 py-4 sm:py-5 text-lg sm:text-xl font-bold text-foreground border-2 border-border rounded-full backdrop-blur-md bg-foreground/5 hover:bg-foreground/10 hover:scale-105 active:scale-95 transition-all">
              See a sample
            </button>
          </a>
        </Reveal>

        {/* How it works: 3 steps */}
        <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 mb-4">
          {steps.map((step, i) => (
            <div key={step.title} className="flex flex-col items-center text-center px-4">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-2 border border-border font-bold text-sm mb-3">
                {i + 1}
              </div>
              <h3 className="font-bold text-lg mb-1">{step.title}</h3>
              <p className="text-sm text-text-muted">{step.description}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Trust strip */}
      <section className="relative z-10 border-y border-border bg-surface/50 backdrop-blur-md py-8 px-4 sm:px-8">
        <div className="container mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl">
          {trustPoints.map((point) => (
            <div key={point.label} className="flex flex-col items-center text-center gap-1">
              <span className="font-bold text-sm">{point.label}</span>
              <span className="text-xs text-text-subtle">{point.description}</span>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-text-subtle mt-6">
          Read the full <Link href="/privacy" className="underline hover:text-foreground transition-colors">privacy policy</Link>.
        </p>
      </section>

      {/* Sample wrap preview — no login required */}
      <section id="sample-wrap" className="relative z-10 py-20 px-4 sm:px-8 scroll-mt-20">
        <div className="container mx-auto flex flex-col items-center">
          <p className="text-center text-text-subtle uppercase tracking-[0.3em] text-sm font-bold mb-2">Sample preview</p>
          <h2 className="text-2xl sm:text-3xl font-black mb-10 text-center">See what your wrap could look like</h2>

          <div className="w-full max-w-sm aspect-[4/5] p-8 rounded-3xl flex flex-col justify-between border-4 border-border shadow-2xl bg-gradient-to-b from-black via-gray-950 to-black text-white">
            <div>
              <h3 className="text-3xl font-black mb-1 text-[var(--spotify-green)]">OmniWrap {getWrapYear()}</h3>
              <p className="opacity-70 text-sm italic">Sample data — not a real account</p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-white/10 pb-2"><span>Total Activity</span><span className="font-black">{sampleWrap.totalHours}h</span></div>
              <div className="flex justify-between border-b border-white/10 pb-2"><span>Top Artist</span><span className="font-black">{sampleWrap.topArtist}</span></div>
              <div className="flex justify-between border-b border-white/10 pb-2"><span>Code Commits</span><span className="font-black">{sampleWrap.commits}</span></div>
              <div className="flex justify-between border-b border-white/10 pb-2"><span>Distance</span><span className="font-black">{sampleWrap.distanceKm}km</span></div>
            </div>
            <div className="text-center pt-2"><p className="text-xs opacity-70">CONNECT YOUR ACCOUNTS TO GENERATE YOURS</p></div>
          </div>

          <Link href="/dashboard" className="mt-8">
            <button className="px-8 py-3 text-base font-bold text-black bg-[var(--spotify-green)] rounded-full shadow-lg hover:brightness-110 hover:scale-105 active:scale-95 transition-all">
              Get your wrap
            </button>
          </Link>
        </div>
      </section>

      {/* Supported Services */}
      <section className="relative z-10 py-16 px-4 sm:px-8">
        <div className="container mx-auto">
          <p className="text-center text-text-subtle uppercase tracking-[0.3em] text-sm font-bold mb-10">Supported today</p>
          <div className="flex flex-wrap justify-center items-center gap-10 sm:gap-14">
            {services.map((service) => (
              <div key={service.name} className="flex flex-col items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
                <div className="w-10 h-10 sm:w-12 sm:h-12" style={{ color: service.color }}>
                  {service.icon}
                </div>
                <span className="text-xs text-text-subtle font-semibold">{service.name}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-text-subtle text-sm mt-8">More services coming soon.</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
