import { describe, it, expect, vi, afterEach } from 'vitest';
import { rateLimit } from '../rateLimit';

describe('rateLimit', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests under the limit', () => {
    const key = `test-${Math.random()}`;
    const first = rateLimit(key, 3, 1000);
    const second = rateLimit(key, 3, 1000);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(second.remaining).toBe(1);
  });

  it('rejects once the limit is exhausted within the window', () => {
    const key = `test-${Math.random()}`;
    rateLimit(key, 2, 1000);
    rateLimit(key, 2, 1000);
    const third = rateLimit(key, 2, 1000);

    expect(third.ok).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it('resets after the window elapses', () => {
    vi.useFakeTimers();
    const key = `test-${Math.random()}`;
    rateLimit(key, 1, 1000);
    const blocked = rateLimit(key, 1, 1000);
    expect(blocked.ok).toBe(false);

    vi.advanceTimersByTime(1001);
    const afterReset = rateLimit(key, 1, 1000);
    expect(afterReset.ok).toBe(true);
  });

  it('tracks independent keys separately', () => {
    const keyA = `test-a-${Math.random()}`;
    const keyB = `test-b-${Math.random()}`;
    rateLimit(keyA, 1, 1000);
    const resultA = rateLimit(keyA, 1, 1000);
    const resultB = rateLimit(keyB, 1, 1000);

    expect(resultA.ok).toBe(false);
    expect(resultB.ok).toBe(true);
  });
});
