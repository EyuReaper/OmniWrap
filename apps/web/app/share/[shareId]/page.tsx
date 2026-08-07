import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { prisma } from '@/lib/prisma';
import { buildPublicSnapshot } from '@/lib/share';
import { SITE_NAME } from '@/lib/site';
import { WrapData } from '@/lib/types';

async function getSnapshot(shareId: string) {
  const wrap = await prisma.wrap.findFirst({
    where: { shareId, isPublic: true },
    select: { year: true, data: true, user: { select: { name: true } } },
  });

  if (!wrap) return null;
  return buildPublicSnapshot(wrap.data as WrapData, wrap.year, wrap.user.name);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shareId: string }>;
}): Promise<Metadata> {
  const { shareId } = await params;
  const snapshot = await getSnapshot(shareId);

  if (!snapshot) return { title: 'Wrap not found' };

  const title = `${snapshot.displayName ?? 'Someone'}'s OmniWrap ${snapshot.year}`;
  return { title, description: `${snapshot.totalHours} hours across their digital year.` };
}

export default async function SharedWrapPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const snapshot = await getSnapshot(shareId);

  if (!snapshot) notFound();

  const stats: { label: string; value: string }[] = [
    { label: 'Total Activity', value: `${snapshot.totalHours}h` },
  ];
  if (snapshot.topSong) stats.push({ label: 'Top Track', value: snapshot.topSong });
  if (snapshot.commits !== undefined) stats.push({ label: 'Code Commits', value: `${snapshot.commits}` });
  if (snapshot.distanceKm !== undefined) stats.push({ label: 'Distance', value: `${snapshot.distanceKm}km` });
  if (snapshot.streakDays !== undefined) stats.push({ label: 'Streak', value: `${snapshot.streakDays} days` });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-6 py-16">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-10 shadow-2xl">
        <h1 className="text-3xl font-black mb-1 bg-clip-text text-transparent bg-gradient-to-r from-[var(--spotify-green)] via-foreground to-[var(--youtube-red)]">
          {SITE_NAME} {snapshot.year}
        </h1>
        <p className="text-text-muted italic mb-8">
          {snapshot.displayName ? `${snapshot.displayName}'s digital year` : 'A digital year, unified'}
        </p>
        <div className="space-y-4">
          {stats.map((s) => (
            <div key={s.label} className="flex justify-between border-b border-border pb-2">
              <span className="text-text-muted">{s.label}</span>
              <span className="font-black truncate max-w-[55%] text-right">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
      <Link href="/" className="mt-10">
        <Button variant="primary" size="lg">
          Generate your own {SITE_NAME}
        </Button>
      </Link>
    </div>
  );
}
