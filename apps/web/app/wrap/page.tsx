// Server Component: gates on the session and reads any already-cached wrap in a
// single indexed lookup, so returning visitors get their wrap in the initial
// HTML. Generating a *new* wrap fans out to every provider API, so that stays a
// client-triggered call rather than something that blocks the server render.
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SITE_URL } from '@/lib/site';
import { WrapData } from '@/lib/types';
import WrapExperience, { InitialShareState } from './WrapExperience';

const YEAR = 2025;

export default async function WrapPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-4xl font-black text-white mb-6">😕 Oops!</h1>
        <p className="text-xl text-gray-400 mb-10 max-w-lg">
          Sign in to see your {YEAR} Wrap. You&apos;ll need at least one connected service.
        </p>
        <Link href="/signin">
          <Button size="lg" className="!rounded-full">
            Sign in
          </Button>
        </Link>
      </div>
    );
  }

  // Covered by the @@unique([userId, year]) index on Wrap.
  const wrap = await prisma.wrap.findUnique({
    where: { userId_year: { userId: session.user.id, year: YEAR } },
    select: { data: true, isPublic: true, shareId: true },
  });

  const initialShare: InitialShareState = {
    isPublic: wrap?.isPublic ?? false,
    shareUrl: wrap?.shareId ? `${SITE_URL}/share/${wrap.shareId}` : null,
  };

  return (
    <WrapExperience
      initialData={(wrap?.data as WrapData | undefined) ?? null}
      initialShare={initialShare}
    />
  );
}
