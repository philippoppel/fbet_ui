import { vi, describe, it, expect, afterEach } from 'vitest';

vi.mock('./jwt', () => ({ verifyJwt: vi.fn() }));
vi.mock('./prisma', () => ({ prisma: { user: { findUnique: vi.fn() } } }));

const { verifyJwt } = await import('./jwt');
const { prisma } = await import('./prisma');
const { getCurrentUserFromRequest } = await import('./auth');

describe('getCurrentUserFromRequest', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns user from Authorization header', async () => {
    const req: any = {
      headers: new Headers({ Authorization: 'Bearer token' }),
      cookies: { get: () => undefined },
    };
    (verifyJwt as any).mockReturnValue({ sub: '1' });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 1,
      email: 'a@example.com',
      name: 'Alice',
      isActive: true,
    });
    const result = await getCurrentUserFromRequest(req);
    expect(verifyJwt).toHaveBeenCalledWith('token');
    expect(result?.id).toBe(1);
  });

  it('falls back to cookie token', async () => {
    const req: any = {
      headers: new Headers({ Authorization: 'Bearer null' }),
      cookies: { get: () => ({ value: 'cookie-token' }) },
    };
    (verifyJwt as any).mockReturnValue({ sub: '2' });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 2,
      email: 'b@example.com',
      name: 'Bob',
      isActive: true,
    });
    const result = await getCurrentUserFromRequest(req);
    expect(verifyJwt).toHaveBeenCalledWith('cookie-token');
    expect(result?.id).toBe(2);
  });

  it('returns null for invalid token', async () => {
    const req: any = {
      headers: new Headers({ Authorization: 'Bearer bad' }),
      cookies: { get: () => undefined },
    };
    (verifyJwt as any).mockReturnValue(null);
    const result = await getCurrentUserFromRequest(req);
    expect(result).toBeNull();
  });
});
