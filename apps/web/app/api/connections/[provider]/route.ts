import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CONNECTABLE_SERVICES } from '@/lib/serviceCatalog';
import { logAudit } from '@/lib/auditLog';

/** Disconnects a service: removes the stored tokens/metadata for the current user. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { provider } = await params;

  if (!CONNECTABLE_SERVICES.some((s) => s.provider === provider)) {
    return NextResponse.json({ error: 'Unknown provider' }, { status: 404 });
  }

  const existing = await prisma.connection.findUnique({
    where: { userId_provider: { userId: session.user.id, provider } },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Not connected' }, { status: 404 });
  }

  await prisma.connection.delete({
    where: { userId_provider: { userId: session.user.id, provider } },
  });

  await logAudit(session.user.id, 'connection.disconnect', {
    userEmail: session.user.email,
    metadata: { provider },
  });

  return NextResponse.json({ ok: true, provider });
}
