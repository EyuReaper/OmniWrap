import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface Preferences {
  emailNotifications?: boolean;
  publicWrap?: boolean;
}

const ALLOWED_KEYS: (keyof Preferences)[] = ['emailNotifications', 'publicWrap'];

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Preferences;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const patch: Preferences = {};
  for (const key of ALLOWED_KEYS) {
    if (typeof body[key] === 'boolean') patch[key] = body[key];
  }

  const current = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferences: true },
  });

  const merged = { ...(current?.preferences as Preferences | null), ...patch };

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { preferences: merged },
    select: { preferences: true },
  });

  return NextResponse.json(updated);
}
