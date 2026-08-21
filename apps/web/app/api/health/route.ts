import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createRequestLogger } from '@/lib/logger';

/**
 * Liveness/readiness probe: returns 200 only when the database responds.
 * Wire this into your platform's health checks (Vercel Cron, load balancer,
 * uptime monitors) so unhealthy instances get replaced/flagged.
 */
export async function GET() {
  const log = createRequestLogger('api/health');
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'ok',
      db: 'ok',
      timeMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('Health check failed — database unreachable', error);
    return NextResponse.json(
      { status: 'error', db: 'unreachable', timeMs: Date.now() - started },
      { status: 503 },
    );
  }
}