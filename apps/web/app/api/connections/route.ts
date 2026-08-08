import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getConnectionStatuses } from '@/lib/connections';

/** Returns per-service connection status for the current user. */
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const connections = await getConnectionStatuses(session.user.id);

  return NextResponse.json({ connections });
}
