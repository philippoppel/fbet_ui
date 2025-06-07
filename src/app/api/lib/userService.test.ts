import { vi, describe, it, expect, afterEach } from 'vitest';

vi.mock('./prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn() },
  },
}));
vi.mock('./hash', () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));
vi.mock('./jwt', () => ({
  signJwt: vi.fn(() => 'signed-token'),
}));

const { prisma } = await import('./prisma');
const { hashPassword, verifyPassword } = await import('./hash');
const { signJwt } = await import('./jwt');
const { createUser, authenticateUser } = await import('./userService');

describe('userService', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createUser', () => {
    it('throws when email already registered', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: 1 });
      await expect(createUser('a@example.com', 'Alice', 'pass')).rejects.toThrow(
        'Email already registered.'
      );
    });

    it('creates user with hashed password', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (hashPassword as any).mockResolvedValue('hashed');
      const created = {
        id: 1,
        email: 'a@example.com',
        name: 'Alice',
        isActive: true,
        createdAt: new Date('2020-01-01T00:00:00Z'),
        updatedAt: new Date('2020-01-02T00:00:00Z'),
      };
      (prisma.user.create as any).mockResolvedValue(created);

      const result = await createUser('a@example.com', 'Alice', 'secret');
      expect(hashPassword).toHaveBeenCalledWith('secret');
      expect(prisma.user.create).toHaveBeenCalled();
      expect(result).toEqual(created);
    });
  });

  describe('authenticateUser', () => {
    it('returns null when user not found', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      const result = await authenticateUser('a@example.com', 'pass');
      expect(result).toBeNull();
    });

    it('returns null when user inactive', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 1,
        email: 'a@example.com',
        name: 'Alice',
        hashedPassword: 'hash',
        isActive: false,
      });
      const result = await authenticateUser('a@example.com', 'pass');
      expect(result).toBeNull();
    });

    it('returns null when password invalid', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 1,
        email: 'a@example.com',
        name: 'Alice',
        hashedPassword: 'hash',
        isActive: true,
      });
      (verifyPassword as any).mockResolvedValue(false);
      const result = await authenticateUser('a@example.com', 'pass');
      expect(verifyPassword).toHaveBeenCalledWith('pass', 'hash');
      expect(result).toBeNull();
    });

    it('returns token and user when valid', async () => {
      const user = {
        id: 1,
        email: 'a@example.com',
        name: 'Alice',
        hashedPassword: 'hash',
        isActive: true,
        createdAt: new Date('2020-01-01T00:00:00Z'),
        updatedAt: new Date('2020-01-02T00:00:00Z'),
      };
      (prisma.user.findUnique as any).mockResolvedValue(user);
      (verifyPassword as any).mockResolvedValue(true);

      const result = await authenticateUser('a@example.com', 'pass');
      expect(signJwt).toHaveBeenCalledWith({ sub: user.id });
      expect(result).toEqual({
        token: 'signed-token',
        user: {
          id: 1,
          email: 'a@example.com',
          name: 'Alice',
          isActive: true,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    });
  });
});

