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

import { auth } from '@/lib/auth';
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
