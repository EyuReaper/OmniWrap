import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { SITE_URL } from '@/lib/site';

const YEAR = 2025;

function shareUrlFor(shareId: string) {
  return `${SITE_URL}/share/${shareId}`;
}

/** Current public-sharing status for the caller's wrap. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const wrap = await prisma.wrap.findUnique({
    where: { userId_year: { userId: session.user.id, year: YEAR } },
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
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const enabled = Boolean(body?.enabled);

  const wrap = await prisma.wrap.findUnique({
    where: { userId_year: { userId: session.user.id, year: YEAR } },
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
