import { getHighscoreForGroup } from './highscoreService';
import { vi, describe, it, expect, afterEach } from 'vitest';

type Member = { id: number; name: string | null; email: string | null };

type Score = { userId: number; _sum: { points: number | null } };

vi.mock('@/app/api/lib/prisma', () => {
  return {
    prisma: {
      user: { findMany: vi.fn() },
      tip: { groupBy: vi.fn() },
    },
  };
});

const { prisma } = await import('@/app/api/lib/prisma');

describe('getHighscoreForGroup', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns empty array when no members', async () => {
    (prisma.user.findMany as any).mockResolvedValue([]);
    const result = await getHighscoreForGroup(1);
    expect(result).toEqual([]);
  });

  it('aggregates and sorts scores', async () => {
    const members: Member[] = [
      { id: 1, name: 'Alice', email: 'a@x.com' },
      { id: 2, name: null, email: 'bob@x.com' },
    ];
    const scores: Score[] = [
      { userId: 1, _sum: { points: 5 } },
      { userId: 2, _sum: { points: 10 } },
    ];
    (prisma.user.findMany as any).mockResolvedValue(members);
    (prisma.tip.groupBy as any).mockResolvedValue(scores);

    const result = await getHighscoreForGroup(123);
    expect(result).toEqual([
      { user_id: 2, name: 'bob', points: 10 },
      { user_id: 1, name: 'Alice', points: 5 },
    ]);
  });
});
