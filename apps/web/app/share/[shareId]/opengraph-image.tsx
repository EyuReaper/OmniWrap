import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/prisma';
import { buildPublicSnapshot } from '@/lib/share';
import { SITE_NAME } from '@/lib/site';
import { WrapData } from '@/lib/types';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function getSnapshot(shareId: string) {
  const wrap = await prisma.wrap.findFirst({
    where: { shareId, isPublic: true },
    select: { year: true, data: true, user: { select: { name: true } } },
  });

  if (!wrap) return null;
  return buildPublicSnapshot(wrap.data as WrapData, wrap.year, wrap.user.name);
}

export default async function ShareOpengraphImage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const snapshot = await getSnapshot(shareId);

  const heading = snapshot
    ? `${snapshot.displayName ?? 'Someone'}'s ${SITE_NAME} ${snapshot.year}`
    : SITE_NAME;

  const stats = snapshot
    ? [
        { label: 'Hours', value: `${snapshot.totalHours}` },
        ...(snapshot.commits !== undefined ? [{ label: 'Commits', value: `${snapshot.commits}` }] : []),
        ...(snapshot.distanceKm !== undefined ? [{ label: 'km', value: `${snapshot.distanceKm}` }] : []),
        ...(snapshot.streakDays !== undefined ? [{ label: 'Streak', value: `${snapshot.streakDays}` }] : []),
      ].slice(0, 4)
    : [];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a0b 0%, #121016 50%, #0a0a0b 100%)',
          padding: '80px',
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: '#ffffff',
            fontFamily: 'sans-serif',
            textAlign: 'center',
          }}
        >
          {heading}
        </div>
        {stats.length > 0 && (
          <div style={{ display: 'flex', gap: 48, marginTop: 48 }}>
            {stats.map((s) => (
              <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: 56, fontWeight: 900, color: '#1DB954', fontFamily: 'sans-serif' }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 24, color: '#d4d4d8', fontFamily: 'sans-serif', textTransform: 'uppercase' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    { ...size },
  );
}
