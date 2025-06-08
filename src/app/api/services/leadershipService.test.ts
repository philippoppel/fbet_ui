import { vi, describe, it, expect, afterEach } from 'vitest';

vi.mock('@/app/api/lib/prisma', () => ({
  prisma: {
    tip: { findMany: vi.fn() },
    leadershipStreak: {
      updateMany: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const { prisma } = await import('@/app/api/lib/prisma');
const { calculateHighscoresForGroup, updateLeadershipStreaks } = await import('./leadershipService');

describe('leadershipService', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('calculateHighscoresForGroup', () => {
    it('returns empty array when no tips', async () => {
      (prisma.tip.findMany as any).mockResolvedValue([]);
      const result = await calculateHighscoresForGroup(1);
      expect(result).toEqual([]);
    });

    it('aggregates and sorts tips by points', async () => {
      (prisma.tip.findMany as any).mockResolvedValue([
        { userId: 1, points: 5, user: { name: 'Alice' } },
        { userId: 2, points: 10, user: { name: 'Bob' } },
        { userId: 1, points: 3, user: { name: 'Alice' } },
      ]);
      const result = await calculateHighscoresForGroup(2);
      expect(result).toEqual([
        { userId: 2, totalPoints: 10, name: 'Bob' },
        { userId: 1, totalPoints: 8, name: 'Alice' },
      ]);
      expect(prisma.tip.findMany).toHaveBeenCalled();
    });
  });

  describe('updateLeadershipStreaks', () => {
    it('ends active streaks when no highscores', async () => {
      (prisma.tip.findMany as any).mockResolvedValue([]);
      (prisma.leadershipStreak.updateMany as any).mockResolvedValue({ count: 1 });

      await updateLeadershipStreaks(5);
      expect(prisma.leadershipStreak.updateMany).toHaveBeenCalledWith({
        where: { groupId: 5, ended_on: null },
        data: { ended_on: expect.any(Date) },
      });
      expect(prisma.leadershipStreak.create).not.toHaveBeenCalled();
    });

    it('starts new streak for new leader', async () => {
      (prisma.tip.findMany as any).mockResolvedValue([
        { userId: 1, points: 10, user: { name: 'Alice' } },
      ]);
      (prisma.leadershipStreak.findMany as any).mockResolvedValue([]);

      await updateLeadershipStreaks(3);
      expect(prisma.leadershipStreak.create).toHaveBeenCalledWith({
        data: {
          groupId: 3,
          userId: 1,
          becameLeaderOn: expect.any(Date),
          ended_on: null,
        },
      });
      expect(prisma.leadershipStreak.updateMany).not.toHaveBeenCalled();
    });
  });
});

