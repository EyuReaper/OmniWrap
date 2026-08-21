/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles for Prisma/NextAuth payloads */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

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

function makeRequest(url = 'http://localhost:3000/api/wrap'): NextRequest {
  return new NextRequest(url);
}

describe('/api/wrap Auth 401 Paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/wrap should return 401 Unauthorized when session is null', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('GET /api/wrap should return 401 Unauthorized when session has no user or user.id', async () => {
    vi.mocked(auth).mockResolvedValue({ user: {} } as any);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('POST /api/wrap should return 401 Unauthorized when session is null', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('POST /api/wrap should return 401 Unauthorized when session has no user or user.id', async () => {
    vi.mocked(auth).mockResolvedValue({ user: {} } as any);

    const response = await POST(makeRequest());
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
      const response = await POST(makeRequest());
      expect(response.status).toBe(200);
    }

    const limited = await POST(makeRequest());
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).not.toBeNull();
  });

  it('GET falls back to the generation quota only on a cache miss, and shares the quota with POST', async () => {
    const userId = `quota-user-${Math.random()}`;
    vi.mocked(auth).mockResolvedValue({ user: { id: userId } } as any);
    vi.mocked(prisma.wrap.findUnique).mockResolvedValue(null as any);

    for (let i = 0; i < 5; i++) {
      await POST(makeRequest());
    }
    for (let i = 0; i < 5; i++) {
      const response = await GET(makeRequest());
      expect(response.status).toBe(200);
    }

    const limited = await GET(makeRequest());
    expect(limited.status).toBe(429);
  });

  it('GET serves a cached wrap without consuming the generation quota', async () => {
    const userId = `quota-user-${Math.random()}`;
    vi.mocked(auth).mockResolvedValue({ user: { id: userId } } as any);
    vi.mocked(prisma.wrap.findUnique).mockResolvedValue({
      data: { spotify: { minutes: 300 } },
      createdAt: new Date(),
    } as any);

    for (let i = 0; i < 50; i++) {
      const response = await GET(makeRequest());
      expect(response.status).toBe(200);
    }
    expect(vi.mocked(prisma.wrap.findUnique)).toHaveBeenCalledTimes(50);
  });

  it('GET tags a cached wrap as stale when it is older than the TTL', async () => {
    const userId = `quota-user-${Math.random()}`;
    vi.mocked(auth).mockResolvedValue({ user: { id: userId } } as any);
    vi.mocked(prisma.wrap.findUnique).mockResolvedValue({
      data: { spotify: { minutes: 300 } },
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
    } as any);

    const response = await GET(makeRequest());
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Wrap-Cache')).toBe('stale');
    expect(response.headers.get('X-Wrap-Stale')).toBe('true');
    expect(response.headers.get('X-Wrap-Generated-At')).not.toBeNull();
  });

  it('GET honors a year query parameter', async () => {
    const userId = `quota-user-${Math.random()}`;
    vi.mocked(auth).mockResolvedValue({ user: { id: userId } } as any);
    vi.mocked(prisma.wrap.findUnique).mockResolvedValue({
      data: { github: { commits: 10 } },
      createdAt: new Date(),
    } as any);

    await GET(makeRequest('http://localhost:3000/api/wrap?year=2024'));
    expect(vi.mocked(prisma.wrap.findUnique)).toHaveBeenCalledWith({
      where: { userId_year: { userId, year: 2024 } },
      select: { data: true, createdAt: true },
    });
  });
});