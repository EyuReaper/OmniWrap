import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';

/**
 * Called by the OmniWrap Telegram bot once a user sends `/link <code>`.
 * Promotes the matching pending Connection to "connected". Not user-facing —
 * this endpoint is what turns the dashboard's Telegram link code into a real
 * connection instead of a dead-end modal.
 *
 * Protected by a shared secret (TELEGRAM_WEBHOOK_SECRET) the bot sends as
 * `x-webhook-secret`. If the secret isn't configured, the endpoint stays
 * disabled — link codes will remain "pending" until an operator sets it.
 */
export async function POST(req: Request) {
  if (!env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  if (req.headers.get('x-webhook-secret') !== env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { linkCode?: string; telegramUserId?: string | number; telegramUsername?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { linkCode, telegramUserId, telegramUsername } = body;
  if (!linkCode || !telegramUserId) {
    return NextResponse.json({ error: 'linkCode and telegramUserId are required' }, { status: 400 });
  }

  const pending = await prisma.connection.findFirst({
    where: {
      provider: 'telegram',
      status: 'pending',
      metadata: { path: ['linkCode'], equals: linkCode },
    },
  });

  if (!pending) {
    return NextResponse.json({ error: 'No pending link found for that code' }, { status: 404 });
  }

  await prisma.connection.update({
    where: { id: pending.id },
    data: {
      status: 'connected',
      metadata: { telegramUserId: String(telegramUserId), telegramUsername },
      lastError: null,
    },
  });

  return NextResponse.json({ ok: true });
}
