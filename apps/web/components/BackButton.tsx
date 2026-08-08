'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

/** History navigation needs the router, so it lives in its own client island. */
export default function BackButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  return (
    <Button variant="danger" size="lg" onClick={() => router.back()} className={className}>
      {children}
    </Button>
  );
}
