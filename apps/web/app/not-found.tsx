import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6 text-center">
      <p className="text-sm font-bold uppercase tracking-[0.3em] text-text-subtle mb-4">
        404
      </p>
      <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
        This page didn&apos;t make the wrap
      </h1>
      <p className="text-lg text-text-muted mb-10 max-w-md">
        The page you&apos;re looking for doesn&apos;t exist, moved, or the link is broken.
      </p>
      <Link href="/">
        <Button variant="primary" size="lg">
          Back to home
        </Button>
      </Link>
    </div>
  );
}
