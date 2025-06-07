import { vi, describe, it, expect, afterEach } from 'vitest';

vi.mock('uuid', () => ({ v4: vi.fn(() => 'test-uuid') }));
vi.mock('@/app/api/lib/prisma', () => ({
  prisma: {
    groupMembership: { findFirst: vi.fn(), create: vi.fn() },
    group: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

const { prisma } = await import('@/app/api/lib/prisma');
const { v4: uuidv4 } = await import('uuid');
const {
  isUserMemberOfGroup,
  addUserToGroup,
  regenerateInviteTokenForGroup,
} = await import('./groupService');

describe('groupService', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('isUserMemberOfGroup', () => {
    it('returns true when membership exists', async () => {
      (prisma.groupMembership.findFirst as any).mockResolvedValue({ id: 1 });
      const result = await isUserMemberOfGroup(1, 2);
      expect(result).toBe(true);
      expect(prisma.groupMembership.findFirst).toHaveBeenCalledWith({
        where: { userId: 1, groupId: 2 },
      });
    });

    it('returns false when membership is missing', async () => {
      (prisma.groupMembership.findFirst as any).mockResolvedValue(null);
      const result = await isUserMemberOfGroup(1, 2);
      expect(result).toBe(false);
    });
  });

  describe('addUserToGroup', () => {
    it('throws when user already a member', async () => {
      (prisma.groupMembership.findFirst as any).mockResolvedValue({ id: 1 });
      await expect(addUserToGroup(1, 2)).rejects.toThrow(
        'User is already a member of this group.'
      );
    });

    it('creates membership when user not member', async () => {
      (prisma.groupMembership.findFirst as any).mockResolvedValue(null);
      (prisma.groupMembership.create as any).mockResolvedValue({
        id: 3,
        userId: 1,
        groupId: 2,
      });
      const result = await addUserToGroup(1, 2);
      expect(prisma.groupMembership.create).toHaveBeenCalledWith({
        data: { userId: 1, groupId: 2 },
      });
      expect(result).toEqual({ id: 3, userId: 1, groupId: 2 });
    });
  });

  describe('regenerateInviteTokenForGroup', () => {
    it('returns null when group not found', async () => {
      (prisma.group.findUnique as any).mockResolvedValue(null);
      const result = await regenerateInviteTokenForGroup(5, 1);
      expect(result).toBeNull();
    });

    it('throws when current user is not creator', async () => {
      (prisma.group.findUnique as any).mockResolvedValue({ id: 5, createdById: 2 });
      await expect(regenerateInviteTokenForGroup(5, 1)).rejects.toThrow(
        'Unauthorized to regenerate token for this group'
      );
    });

    it('updates invite token when authorized', async () => {
      (prisma.group.findUnique as any).mockResolvedValue({ id: 5, createdById: 1 });
      (prisma.group.update as any).mockResolvedValue({ id: 5, inviteToken: 'test-uuid' });
      const result = await regenerateInviteTokenForGroup(5, 1);
      expect(uuidv4).toHaveBeenCalled();
      expect(prisma.group.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { inviteToken: 'test-uuid' },
      });
      expect(result).toEqual({ id: 5, inviteToken: 'test-uuid' });
    });
  });
});
