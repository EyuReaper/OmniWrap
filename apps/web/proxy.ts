import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';

// Throttles OAuth sign-in *initiation* per IP. The actual credential surface
// lives at each provider (Spotify/Google/GitHub/...), which has its own bot
// defenses — this just stops a single client from hammering our redirect
// endpoint to script account creation attempts or burn our share of an
// upstream provider's rate limit.
const SIGNIN_LIMIT = 20;
const SIGNIN_WINDOW_MS = 60_000;

export function proxy(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { ok, resetAt } = rateLimit(`signin:${ip}`, SIGNIN_LIMIT, SIGNIN_WINDOW_MS);

  if (!ok) {
    return NextResponse.json(
      { error: 'Too many sign-in attempts. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString() } },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/auth/signin/:path*'],
};
