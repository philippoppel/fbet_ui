import { vi, describe, it, expect, afterEach } from 'vitest';

vi.mock('uuid', () => ({ v4: vi.fn(() => 'test-uuid') }));
vi.mock('@/app/api/lib/prisma', () => ({
  prisma: {
    groupMembership: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    group: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const { prisma } = await import('@/app/api/lib/prisma');
const { v4: uuidv4 } = await import('uuid');
const {
  isUserMemberOfGroup,
  addUserToGroup,
  regenerateInviteTokenForGroup,
  createGroup,
  getGroupById,
  getGroupByInviteToken,
  getUserGroups,
  getMembersOfGroup,
  updateGroupImage,
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

  describe('createGroup', () => {
    it('creates group and membership in transaction', async () => {
      const data = { name: 'g', description: null, imageUrl: null } as any;
      const created = { id: 7, inviteToken: 'test-uuid' };
      const groupCreate = vi.fn().mockResolvedValue(created);
      const membershipCreate = vi.fn().mockResolvedValue({});
      (prisma.$transaction as any).mockImplementation(async (cb: any) => {
        return cb({
          group: { create: groupCreate },
          groupMembership: { create: membershipCreate },
        });
      });

      const result = await createGroup(data, 1);

      expect(uuidv4).toHaveBeenCalled();
      expect(groupCreate).toHaveBeenCalledWith({
        data: {
          name: 'g',
          description: null,
          imageUrl: null,
          createdById: 1,
          inviteToken: 'test-uuid',
        },
      });
      expect(membershipCreate).toHaveBeenCalledWith({
        data: { userId: 1, groupId: created.id },
      });
      expect(result).toBe(created);
    });
  });

  describe('getGroupById', () => {
    it('fetches group by id', async () => {
      (prisma.group.findUnique as any).mockResolvedValue({ id: 3 });
      const result = await getGroupById(3);
      expect(prisma.group.findUnique).toHaveBeenCalledWith({ where: { id: 3 } });
      expect(result).toEqual({ id: 3 });
    });
  });

  describe('getGroupByInviteToken', () => {
    it('fetches group by token', async () => {
      (prisma.group.findUnique as any).mockResolvedValue({ id: 4 });
      const result = await getGroupByInviteToken('tok');
      expect(prisma.group.findUnique).toHaveBeenCalledWith({ where: { inviteToken: 'tok' } });
      expect(result).toEqual({ id: 4 });
    });
  });

  describe('getUserGroups', () => {
    it('returns user groups', async () => {
      (prisma.group.findMany as any).mockResolvedValue([{ id: 1 }]);
      const result = await getUserGroups(2, 0, 10);
      expect(prisma.group.findMany).toHaveBeenCalledWith({
        where: { memberships: { some: { userId: 2 } } },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe('getMembersOfGroup', () => {
    it('returns users from memberships', async () => {
      (prisma.groupMembership.findMany as any).mockResolvedValue([
        { user: { id: 1 } },
        { user: { id: 2 } },
      ]);
      const result = await getMembersOfGroup(9);
      expect(prisma.groupMembership.findMany).toHaveBeenCalledWith({
        where: { groupId: 9 },
        include: { user: true },
      });
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });
  });

  describe('updateGroupImage', () => {
    it('updates image url', async () => {
      (prisma.group.update as any).mockResolvedValue({ id: 1, imageUrl: 'x' });
      const result = await updateGroupImage(1, 'x');
      expect(prisma.group.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { imageUrl: 'x' },
      });
      expect(result).toEqual({ id: 1, imageUrl: 'x' });
    });
  });
});
