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
import { getWrapYear, isValidWrapYear } from '@/lib/wrapYear';
import WrapExperience, { InitialShareState } from './WrapExperience';

// Deep-linkable slide moments (?slide=spotify). Ignored unless it maps to a
// slide key WrapExperience understands.
const KNOWN_SLIDE_KEYS = ['intro', 'ready', 'spotify', 'google', 'github', 'strava', 'reconnect', 'legend', 'share'];

export default async function WrapPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; slide?: string }>;
}) {
  const [session, params] = await Promise.all([auth(), searchParams]);

  // ?year= deep links choose the wrap year; otherwise fall back to the
  // recap-season year so /wrap and /dashboard always agree.
  const requestedYear = Number(params?.year);
  const year = Number.isFinite(requestedYear) && isValidWrapYear(requestedYear) ? requestedYear : getWrapYear();
  const initialSlideKey = typeof params?.slide === 'string' && KNOWN_SLIDE_KEYS.includes(params.slide) ? params.slide : null;

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-4xl font-black text-white mb-6">😕 Oops!</h1>
        <p className="text-xl text-gray-400 mb-10 max-w-lg">
          Sign in to see your {year} Wrap. You&apos;ll need at least one connected service.
        </p>
        <Link href="/signin">
          <Button size="lg" className="!rounded-full">
            Sign in
          </Button>
        </Link>
      </div>
    );
  }

  // Covered by the @@unique([userId, year]) index on Wrap. The year list powers
  // the wrap's year selector when the user has more than one annual wrap.
  const [wrap, yearRows] = await Promise.all([
    prisma.wrap.findUnique({
      where: { userId_year: { userId: session.user.id, year } },
      select: { data: true, isPublic: true, shareId: true, createdAt: true },
    }),
    prisma.wrap.findMany({
      where: { userId: session.user.id },
      select: { year: true },
      distinct: ['year'],
      orderBy: { year: 'desc' },
    }),
  ]);

  const initialShare: InitialShareState = {
    isPublic: wrap?.isPublic ?? false,
    shareUrl: wrap?.shareId ? `${SITE_URL}/share/${wrap.shareId}` : null,
  };

  return (
    <WrapExperience
      initialData={(wrap?.data as WrapData | undefined) ?? null}
      initialShare={initialShare}
      year={year}
      initialGeneratedAt={wrap?.createdAt.toISOString() ?? null}
      availableYears={yearRows.map((w) => w.year)}
      initialSlideKey={initialSlideKey}
    />
  );
}
