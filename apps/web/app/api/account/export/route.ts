import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Full data export for the current user (GDPR/CCPA "right to access").
 *
 * Deliberately excludes accessToken/refreshToken — those are encrypted
 * credentials, not user data, and returning them (even encrypted) would
 * widen the blast radius of a leaked export. Everything else the user
 * generated or connected is included.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  const [user, connections, wraps] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, image: true, preferences: true, createdAt: true, updatedAt: true },
    }),
    prisma.connection.findMany({
      where: { userId },
      select: { provider: true, status: true, metadata: true, expiresAt: true, lastError: true, createdAt: true, updatedAt: true },
    }),
    prisma.wrap.findMany({
      where: { userId },
      select: { year: true, data: true, isPublic: true, shareId: true, createdAt: true },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    profile: user,
    connections,
    wraps,
  };

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="omniwrap-export-${userId}.json"`,
    },
  });
}
