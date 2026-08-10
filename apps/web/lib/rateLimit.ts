interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Fixed-window in-memory rate limiter.
 *
 * Per-instance only: a serverless deployment with multiple concurrent
 * instances gets an independent counter per instance, so this throttles a
 * single hot client but is not a hard distributed cap. Swap the Map for
 * Upstash/Redis (same class of problem as Agy's "Serverless DB Connection
 * Pooling" item) before relying on this as the only defense in production.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();

  // Opportunistic sweep so the map doesn't grow unbounded over a long-lived
  // instance's uptime — cheap relative to how rarely it triggers.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.resetAt <= now) buckets.delete(k);
    }
  }

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { ok: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}
