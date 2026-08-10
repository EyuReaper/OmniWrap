/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles for Prisma/NextAuth payloads */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    wrap: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    connection: {
      findMany: vi.fn(),
    },
  },
}));

// Mock auth from NextAuth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

const generateWrap = vi.fn();
vi.mock('@/lib/services/aggregator', () => ({
  Aggregator: class {
    generateWrap = generateWrap;
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GET, POST } from '../route';

describe('/api/wrap Auth 401 Paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/wrap should return 401 Unauthorized when session is null', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('GET /api/wrap should return 401 Unauthorized when session has no user or user.id', async () => {
    vi.mocked(auth).mockResolvedValue({ user: {} } as any);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('POST /api/wrap should return 401 Unauthorized when session is null', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('POST /api/wrap should return 401 Unauthorized when session has no user or user.id', async () => {
    vi.mocked(auth).mockResolvedValue({ user: {} } as any);

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
  });
});

describe('/api/wrap generation quota', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateWrap.mockResolvedValue({ data: { year: 2025 } });
  });

  it('POST returns 429 once the per-user generation quota is exhausted', async () => {
    // Unique per test run so the module-level rate-limit bucket starts fresh.
    const userId = `quota-user-${Math.random()}`;
    vi.mocked(auth).mockResolvedValue({ user: { id: userId } } as any);

    for (let i = 0; i < 10; i++) {
      const response = await POST();
      expect(response.status).toBe(200);
    }

    const limited = await POST();
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).not.toBeNull();
  });

  it('GET falls back to the generation quota only on a cache miss, and shares the quota with POST', async () => {
    const userId = `quota-user-${Math.random()}`;
    vi.mocked(auth).mockResolvedValue({ user: { id: userId } } as any);
    vi.mocked(prisma.wrap.findUnique).mockResolvedValue(null as any);

    for (let i = 0; i < 5; i++) {
      await POST();
    }
    for (let i = 0; i < 5; i++) {
      const response = await GET();
      expect(response.status).toBe(200);
    }

    const limited = await GET();
    expect(limited.status).toBe(429);
  });
});
