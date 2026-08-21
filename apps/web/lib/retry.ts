/**
 * Retry / timeout helpers for upstream API calls.
 *
 * A slow or flaky provider must not exhaust a serverless function: every
 * upstream call should be bounded by a timeout and retried a couple of times
 * with exponential backoff before being reported as failed.
 */

export interface RetryOptions {
  /** Number of retries *after* the first attempt (default 2). */
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Called before each retry with the attempt number (1-based) and error. */
  onRetry?: (attempt: number, error: unknown) => void;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** True for network-level failures (fetch rejects). HTTP statuses are handled separately. */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error && error.name === 'AbortError') return false;
  if (error instanceof Error && /fetch failed|network|ECONN|ENOTFOUND|ETIMEDOUT/i.test(error.message)) {
    return true;
  }
  return false;
}

export function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions & { shouldRetry?: (attempt: number, error: unknown) => boolean } = {},
): Promise<T> {
  const { retries = 2, baseDelayMs = 400, maxDelayMs = 5000, shouldRetry, onRetry } = options;
  const attempts = retries + 1;

  const attempt = async (n: number): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      if (n >= attempts) throw err;
      if (shouldRetry && !shouldRetry(n, err)) throw err;
      // Exponential backoff with jitter so concurrent retries don't pile up.
      const backoff = Math.min(baseDelayMs * 2 ** (n - 1) + Math.random() * 150, maxDelayMs);
      onRetry?.(n, err);
      await sleep(backoff);
      return attempt(n + 1);
    }
  };

  return attempt(1);
}

/** fetch with an AbortController timeout so a hung upstream can't hang us. */
export async function fetchWithTimeout(
  input: string | URL | globalThis.Request,
  init: RequestInit = {},
  timeoutMs = 10_000,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

/** fetchWithTimeout + retry on timeouts, network errors, 429, and 5xx. */
export async function fetchWithRetry(
  input: string | URL | globalThis.Request,
  init: RequestInit = {},
  options: RetryOptions & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 10_000, ...retry } = options;
  return retryWithBackoff(
    () => fetchWithTimeout(input, init, timeoutMs),
    {
      ...retry,
      shouldRetry: (_attempt, err) => {
        if (isNetworkError(err)) return true;
        if (err instanceof Error && 'status' in err) {
          const status = (err as Error & { status?: number }).status;
          return status === 429 || (status !== undefined && status >= 500);
        }
        return false;
      },
    },
  );
}

/**
 * Marks an upstream HTTP error with its status so `fetchWithRetry` and
 * callers can distinguish a retryable 5xx/429 from a definitive 4xx.
 */
export class UpstreamError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'UpstreamError';
  }
}

export async function fetchJsonWithRetry<T>(
  input: string | URL | globalThis.Request,
  init: RequestInit = {},
  options: RetryOptions & { timeoutMs?: number } = {},
): Promise<T> {
  const res = await fetchWithRetry(input, init, options);
  if (!res.ok) {
    throw new UpstreamError(`Upstream responded ${res.status}`, res.status);
  }
  return res.json() as Promise<T>;
}