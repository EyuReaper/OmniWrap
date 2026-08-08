import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MANUAL_PROVIDERS } from '@/lib/serviceCatalog';

interface DuolingoUsersResponse {
  users?: { username: string; totalXp?: number }[];
}

async function validateDuolingoUsername(username: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  let resp: Response;
  try {
    resp = await fetch(
      `https://www.duolingo.com/2017-06-30/users?username=${encodeURIComponent(username)}`,
      { headers: { Accept: 'application/json' } },
    );
  } catch {
    // Network failure reaching Duolingo — distinct from "username not found".
    throw new Error('network_error');
  }

  if (!resp.ok) {
    throw new Error('network_error');
  }

  const data = (await resp.json()) as DuolingoUsersResponse;
  if (!data.users || data.users.length === 0) {
    return { ok: false, reason: 'No Duolingo account found with that username.' };
  }
  return { ok: true };
}

function generateLinkCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

/**
 * Persists a manual (non-OAuth) connection.
 * - duolingo: validates the username against Duolingo's public profile API, then connects immediately.
 * - telegram: issues a link code the user sends to the bot; status starts "pending" until
 *   POST /api/webhooks/telegram confirms the link.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { provider?: string; username?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { provider, username } = body;

  if (!provider || !MANUAL_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
  }

  const userId = session.user.id;

  if (provider === 'duolingo') {
    const trimmed = username?.trim();
    if (!trimmed) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    try {
      const result = await validateDuolingoUsername(trimmed);
      if (!result.ok) {
        return NextResponse.json({ error: result.reason }, { status: 422 });
      }
    } catch {
      return NextResponse.json(
        { error: 'Could not reach Duolingo to verify that username. Check your connection and try again.' },
        { status: 503 },
      );
    }

    const connection = await prisma.connection.upsert({
      where: { userId_provider: { userId, provider } },
      update: { status: 'connected', metadata: { username: trimmed }, lastError: null },
      create: { userId, provider, status: 'connected', metadata: { username: trimmed } },
    });

    return NextResponse.json({ ok: true, status: connection.status, metadata: connection.metadata });
  }

  // telegram
  const linkCode = generateLinkCode();
  const connection = await prisma.connection.upsert({
    where: { userId_provider: { userId, provider } },
    update: { status: 'pending', metadata: { linkCode }, lastError: null },
    create: { userId, provider, status: 'pending', metadata: { linkCode } },
  });

  return NextResponse.json({ ok: true, status: connection.status, linkCode });
}
