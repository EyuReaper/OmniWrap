/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles for Prisma/NextAuth payloads */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    wrap: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GET, POST } from '../route';

function postRequest(body: unknown) {
  return new Request('http://localhost/api/wrap/share', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('/api/wrap/share', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET returns 401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('GET returns not-public defaults when no wrap exists', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any);
    vi.mocked(prisma.wrap.findUnique).mockResolvedValue(null as any);

    const response = await GET();
    const body = await response.json();

    expect(body).toEqual({ isPublic: false, shareId: null, shareUrl: null });
  });

  it('GET returns existing share status', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any);
    vi.mocked(prisma.wrap.findUnique).mockResolvedValue({
      isPublic: true,
      shareId: 'abc123',
    } as any);

    const response = await GET();
    const body = await response.json();

    expect(body.isPublic).toBe(true);
    expect(body.shareId).toBe('abc123');
    expect(body.shareUrl).toContain('/share/abc123');
  });

  it('POST returns 401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const response = await POST(postRequest({ enabled: true }));
    expect(response.status).toBe(401);
  });

  it('POST returns 404 when no wrap exists yet', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any);
    vi.mocked(prisma.wrap.findUnique).mockResolvedValue(null as any);

    const response = await POST(postRequest({ enabled: true }));
    expect(response.status).toBe(404);
  });

  it('POST assigns a shareId on first enable and toggles isPublic', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any);
    vi.mocked(prisma.wrap.findUnique).mockResolvedValue({
      id: 'wrap1',
      shareId: null,
    } as any);
    vi.mocked(prisma.wrap.update).mockImplementation((async ({ data }: any) => ({
      isPublic: data.isPublic,
      shareId: data.shareId,
    })) as any);

    const response = await POST(postRequest({ enabled: true }));
    const body = await response.json();

    expect(body.isPublic).toBe(true);
    expect(body.shareId).toEqual(expect.any(String));
    expect(body.shareUrl).toContain(`/share/${body.shareId}`);
  });

  it('POST reuses an existing shareId when disabling', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any);
    vi.mocked(prisma.wrap.findUnique).mockResolvedValue({
      id: 'wrap1',
      shareId: 'existing-id',
    } as any);
    vi.mocked(prisma.wrap.update).mockImplementation((async ({ data }: any) => ({
      isPublic: data.isPublic,
      shareId: data.shareId,
    })) as any);

    const response = await POST(postRequest({ enabled: false }));
    const body = await response.json();

    expect(body.isPublic).toBe(false);
    expect(body.shareId).toBe('existing-id');
  });
});
