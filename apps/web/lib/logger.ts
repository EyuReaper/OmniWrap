/**
 * Structured, token-safe logging.
 *
 * Emits JSON lines in production (parseable by log ingestion) and
 * human-readable lines in dev/test. Every message is passed through a
 * redactor before it can reach the console, so OAuth tokens, cookies, and
 * secrets never leak even when a whole connection row is logged by mistake.
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

const SENSITIVE_KEY =
  /access_?token|refresh_?token|authorization|set-?cookie|password|secret|id_token|session[_-]?token|api[_-]?key|private[_-]?key|client_?secret|credential/i;

function redact(obj: unknown): unknown {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    if (typeof obj === 'string') {
      // Encrypted OAuth tokens are "iv:authTag:cipher" — redact anything with
      // that shape regardless of the key it was stored under.
      if (obj.split(':').length === 3 && obj.length > 60) return '[REDACTED]';
      // JWT-shaped strings.
      if (obj.startsWith('eyJ') && obj.split('.').length === 3) return '[REDACTED]';
    }
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(redact);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    out[key] = SENSITIVE_KEY.test(key) ? '[REDACTED]' : redact(value);
  }
  return out;
}

function serialize(level: Level, msg: string, context: LogContext = {}): string {
  const record = {
    level,
    time: new Date().toISOString(),
    msg,
    ...(redact(context) as LogContext),
  };
  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify(record);
  }
  const contextJson = JSON.stringify(redact(context));
  return contextJson === '{}' ? `${record.time} ${level.toUpperCase()} ${msg}` : `${record.time} ${level.toUpperCase()} ${msg} ${contextJson}`;
}

function write(level: Level, msg: string, context: LogContext = {}): void {
  const line = serialize(level, msg, context);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, context?: LogContext) => write('debug', msg, context),
  info: (msg: string, context?: LogContext) => write('info', msg, context),
  warn: (msg: string, context?: LogContext) => write('warn', msg, context),
  /** `error(msg, err)` or `error(msg, err, context)` — the Error is serialized safely. */
  error: (msg: string, error?: unknown, context?: LogContext) =>
    write('error', msg, {
      ...context,
      ...(error instanceof Error
        ? { error: { name: error.name, message: error.message, stack: error.stack } }
        : error !== undefined
          ? { error }
          : {}),
    }),
};

export function createRequestLogger(route: string) {
  return {
    info: (msg: string, context?: LogContext) => logger.info(msg, { route, ...context }),
    warn: (msg: string, context?: LogContext) => logger.warn(msg, { route, ...context }),
    error: (msg: string, error?: unknown, context?: LogContext) =>
      logger.error(msg, error, { route, ...context }),
  };
}