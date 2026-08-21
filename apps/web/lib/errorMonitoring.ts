/**
 * Error monitoring hook.
 *
 * Every unhandled error in an API route or client error boundary flows
 * through `reportError`. When `SENTRY_DSN` is set, the event is forwarded to
 * the Sentry ingestion endpoint (minimal envelope client, no SDK dependency);
 * otherwise it degrades to structured logging. See
 * docs/production-deployment.md for the full @sentry/nextjs integration path.
 */
import { logger } from './logger';

const dsn = process.env.SENTRY_DSN;

export function isErrorMonitoringEnabled(): boolean {
  return Boolean(dsn);
}

function parseDsn(url: string): { host: string; key: string; projectId: string } {
  const parsed = new URL(url);
  return {
    host: parsed.host,
    key: parsed.username,
    projectId: parsed.pathname.replace(/^\//, ''),
  };
}

function stackFrames(error: Error): Array<{ filename?: string; lineno?: number; colno?: number; function?: string }> {
  return (error.stack?.split('\n').slice(1, 8) ?? []).map((line) => {
    const match = line.match(/at (.*?) \((.*):(\d+):(\d+)\)/);
    if (match) {
      return { function: match[1], filename: match[2], lineno: Number(match[3]), colno: Number(match[4]) };
    }
    return { filename: line.trim() };
  });
}

async function sendToSentry(error: unknown, context: Record<string, unknown>): Promise<void> {
  if (!dsn) return;
  try {
    const { host, key, projectId } = parseDsn(dsn);
    const message = error instanceof Error ? error.message : String(error);
    const header = {
      sent_at: new Date().toISOString(),
      sdk: { name: 'omniwrap', version: '0.1.0' },
    };
    const event = {
      event_id: crypto.randomUUID().replace(/-/g, ''),
      timestamp: new Date().toISOString(),
      platform: 'javascript',
      level: 'error',
      message,
      exception:
        error instanceof Error
          ? { values: [{ type: error.name, value: error.message, stacktrace: { frames: stackFrames(error) } }] }
          : undefined,
      extra: context,
      server_name: process.env.HOSTNAME,
    };
    const body = `${JSON.stringify(header)}\n${JSON.stringify(event)}`;
    await fetch(`https://${host}/api/${projectId}/envelope/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${key}`,
      },
      body,
    });
  } catch (err) {
    logger.warn('Failed to forward error to Sentry', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export function reportError(error: unknown, context: Record<string, unknown> = {}): void {
  logger.error('Error reported', error, context);
  if (dsn) void sendToSentry(error, context);
}

export function reportMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  logger[level === 'warning' ? 'warn' : level]('[Message] ' + message);
}