import Link from 'next/link';
import { GITHUB_REPO_URL } from '@/lib/site';

const links = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/support', label: 'Support' },
];

export default function Footer() {
  return (
    <footer className="relative z-10 py-10 border-t border-border bg-surface/60 backdrop-blur-xl">
      <div className="container mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <p className="text-text-muted text-sm md:text-base">
          © {new Date().getFullYear()} Made by{' '}
          <a
            href="https://eyus-portfolio.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-foreground hover:text-[var(--spotify-green)] transition-colors rounded-sm"
          >
            EyuReaper
          </a>
        </p>
        <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-text-muted hover:text-foreground transition-colors rounded-sm"
            >
              {link.label}
            </Link>
          ))}
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted hover:text-foreground transition-colors rounded-sm"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
