import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

// Throttles OAuth sign-in *initiation* per IP. The actual credential surface
// lives at each provider (Spotify/Google/GitHub/...), which has its own bot
// defenses — this just stops a single client from hammering our redirect
// endpoint to script account creation attempts or burn our share of an
// upstream provider's rate limit.
const SIGNIN_LIMIT = 20;
const SIGNIN_WINDOW_MS = 60_000;

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // OAuth sign-in initiation throttle.
  if (pathname.startsWith('/api/auth/signin')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const { ok, resetAt } = rateLimit(`signin:${ip}`, SIGNIN_LIMIT, SIGNIN_WINDOW_MS);

    if (!ok) {
      return NextResponse.json(
        { error: 'Too many sign-in attempts. Try again shortly.' },
        { status: 429, headers: { 'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString() } },
      );
    }
  }

  // Protect authenticated pages. Next 16 runs proxy.ts on the Node.js runtime
  // (middleware previously ran on edge), so the database-backed `auth()` works
  // here. The pages themselves still re-check `auth()` server-side — this is
  // defense-in-depth plus a clean redirect instead of an inline sign-in prompt.
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/wrap')) {
    const session = await auth();
    if (!session?.user?.id) {
      logger.info('Proxy: redirecting unauthenticated user to /signin', { pathname });
      const url = request.nextUrl.clone();
      url.pathname = '/signin';
      url.search = '';
      const response = NextResponse.redirect(url);
      response.headers.set('X-Proxy-Auth', 'redirect');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/auth/signin/:path*', '/dashboard/:path*', '/wrap/:path*'],
};