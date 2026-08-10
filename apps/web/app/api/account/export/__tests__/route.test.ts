/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles for Prisma/NextAuth payloads */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    connection: { findMany: vi.fn() },
    wrap: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { GET } from '../route';

describe('GET /api/account/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it('returns 404 when the user row is missing', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as any);
    vi.mocked(prisma.connection.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.wrap.findMany).mockResolvedValue([] as any);

    const response = await GET();

    expect(response.status).toBe(404);
  });

  it('bundles profile, connections, and wraps, and never includes tokens', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      name: 'Test User',
      email: 'test@example.com',
      image: null,
      preferences: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    } as any);
    vi.mocked(prisma.connection.findMany).mockResolvedValue([
      { provider: 'spotify', status: 'connected', metadata: { username: 'x' }, expiresAt: null, lastError: null, createdAt: new Date(), updatedAt: new Date() },
    ] as any);
    vi.mocked(prisma.wrap.findMany).mockResolvedValue([
      { year: 2025, data: { foo: 'bar' }, isPublic: false, shareId: null, createdAt: new Date() },
    ] as any);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toContain('attachment');
    expect(body.profile.email).toBe('test@example.com');
    expect(body.connections).toHaveLength(1);
    expect(body.wraps).toHaveLength(1);
    expect(JSON.stringify(body)).not.toMatch(/accessToken|refreshToken/i);
  });
});
