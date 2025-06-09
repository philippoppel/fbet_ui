import { describe, it, expect, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/app/api/lib/auth', () => ({ getCurrentUserFromRequest: vi.fn() }));
vi.mock('@/app/api/services/groupService', () => ({ isUserMemberOfGroup: vi.fn() }));
vi.mock('@/app/api/lib/prisma', () => ({ prisma: { group: { findUnique: vi.fn() } } }));

const { getCurrentUserFromRequest } = await import('@/app/api/lib/auth');
const { isUserMemberOfGroup } = await import('@/app/api/services/groupService');
const { prisma } = await import('@/app/api/lib/prisma');
const { GET } = await import('@/app/api/groups/[groupId]/route');

describe('GET /api/groups/[groupId]', () => {
  afterEach(() => vi.resetAllMocks());

  it('returns group details when authorized', async () => {
    (getCurrentUserFromRequest as any).mockResolvedValue({ id: 1 });
    (isUserMemberOfGroup as any).mockResolvedValue(true);
    (prisma.group.findUnique as any).mockResolvedValue({ id: 2, name: 'G' });

    const req = new NextRequest('http://localhost/api/groups/2');
    const res = await GET(req, { params: { groupId: '2' } } as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.name).toBe('G');
  });
});
