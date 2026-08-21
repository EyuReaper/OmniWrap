'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { reportError } from '@/lib/errorMonitoring';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { boundary: 'global-error', digest: error.digest });
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6 text-center">
      <p className="text-sm font-bold uppercase tracking-[0.3em] text-danger mb-4">500</p>
      <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
        Something broke on our end
      </h1>
      <p className="text-lg text-text-muted mb-10 max-w-md">
        An unexpected error occurred while rendering this page. You can try again, or head back
        to the dashboard.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button variant="primary" size="lg" onClick={reset}>
          Try again
        </Button>
        <Link href="/dashboard">
          <Button variant="secondary" size="lg" className="w-full">
            Go to dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
