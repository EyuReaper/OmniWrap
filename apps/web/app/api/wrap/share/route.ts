import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SITE_URL } from '@/lib/site';
import { getWrapYear, isValidWrapYear } from '@/lib/wrapYear';

function shareUrlFor(shareId: string) {
  return `${SITE_URL}/share/${shareId}`;
}

/** Resolves ?year= to a valid wrap year, defaulting to the recap-season year. */
function parseYear(request: Request): number {
  const raw = new URL(request.url).searchParams.get('year');
  const parsed = Number(raw);
  if (raw !== null && Number.isFinite(parsed) && isValidWrapYear(parsed)) {
    return parsed;
  }
  return getWrapYear();
}

/** Current public-sharing status for the caller's wrap. */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const wrap = await prisma.wrap.findUnique({
    where: { userId_year: { userId: session.user.id, year: parseYear(request) } },
    select: { isPublic: true, shareId: true },
  });

  if (!wrap) {
    return NextResponse.json({ isPublic: false, shareId: null, shareUrl: null });
  }

  return NextResponse.json({
    isPublic: wrap.isPublic,
    shareId: wrap.shareId,
    shareUrl: wrap.shareId ? shareUrlFor(wrap.shareId) : null,
  });
}

/** Toggles public sharing for the caller's wrap. Body: { enabled: boolean } */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const enabled = Boolean(body?.enabled);

  const wrap = await prisma.wrap.findUnique({
    where: { userId_year: { userId: session.user.id, year: parseYear(request) } },
  });

  if (!wrap) {
    return NextResponse.json({ error: 'Generate a wrap before sharing it' }, { status: 404 });
  }

  const updated = await prisma.wrap.update({
    where: { id: wrap.id },
    data: { isPublic: enabled, shareId: wrap.shareId ?? randomUUID() },
  });

  return NextResponse.json({
    isPublic: updated.isPublic,
    shareId: updated.shareId,
    shareUrl: updated.shareId ? shareUrlFor(updated.shareId) : null,
  });
}
