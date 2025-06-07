import { vi, describe, it, expect, afterEach } from 'vitest';

vi.mock('@/app/api/lib/prisma', () => ({
  prisma: {
    event: { findMany: vi.fn(), update: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
    group: { findUnique: vi.fn() },
  },
}));

vi.mock('@/app/api/services/notificationService.ts', () => ({
  sendNewEventNotificationsToGroupMembers: vi.fn(() => ({
    catch: vi.fn(() => Promise.resolve()),
  })),
}));

const { prisma } = await import('@/app/api/lib/prisma');
const {
  getEventsForGroup,
  setEventResult,
  createEvent,
  getEventById,
} = await import('./eventService');
const { Prisma } = await import('@prisma/client');
const {
  sendNewEventNotificationsToGroupMembers,
} = await import('@/app/api/services/notificationService.ts');

describe('eventService', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getEventsForGroup', () => {
    it('maps prisma events to client events', async () => {
      const now = new Date();
      const events = [
        {
          id: 1,
          title: 'E1',
          groupId: 9,
          options: ['a', 'b'],
          hasWildcard: true,
          wildcardType: 'EXACT_SCORE',
          wildcardPrompt: 'prompt',
          wildcardAnswer: null,
          createdAt: now,
          tips: [
            {
              userId: 1,
              selectedOption: 'a',
              wildcardGuess: '1:0',
              points: 1,
              wildcardPoints: 2,
              user: { id: 1, name: 'Alice', email: 'alice@example.com' },
            },
            {
              userId: 2,
              selectedOption: 'b',
              wildcardGuess: null,
              points: null,
              wildcardPoints: null,
              user: { id: 2, name: null, email: 'bob@example.com' },
            },
          ],
          creator: { id: 10, name: 'Creator' },
        },
        {
          id: 2,
          title: 'E2',
          groupId: 9,
          options: ['a', 1],
          hasWildcard: false,
          wildcardType: null,
          wildcardPrompt: null,
          wildcardAnswer: null,
          createdAt: now,
          tips: [],
          creator: { id: 10, name: 'Creator' },
        },
      ];
      (prisma.event.findMany as any).mockResolvedValue(events);

      const result = await getEventsForGroup(9);
      expect(prisma.event.findMany).toHaveBeenCalled();
      expect(result[0].awardedPoints).toEqual([
        {
          userId: 1,
          userName: 'Alice',
          selectedOption: 'a',
          wildcardGuess: '1:0',
          points: 1,
          wildcardPoints: 2,
        },
        {
          userId: 2,
          userName: 'bob',
          selectedOption: 'b',
          wildcardGuess: null,
          points: null,
          wildcardPoints: null,
        },
      ]);
      expect(result[0].options).toEqual(['a', 'b']);
      expect(result[1].options).toEqual([]); // invalid options filtered
    });
  });

  describe('setEventResult', () => {
    it('returns updated event', async () => {
      const updated = { id: 1, winningOption: 'A', wildcardAnswer: 'x' };
      (prisma.event.update as any).mockResolvedValue(updated);
      const result = await setEventResult(1, 'A', 'x');
      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { winningOption: 'A', wildcardAnswer: 'x' },
      });
      expect(result).toBe(updated);
    });

    it('returns null when event not found', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('err', {
        code: 'P2025',
        clientVersion: '1',
      });
      (prisma.event.update as any).mockRejectedValue(error);
      const result = await setEventResult(1, 'A');
      expect(result).toBeNull();
    });

    it('throws other errors', async () => {
      const err = new Error('fail');
      (prisma.event.update as any).mockRejectedValue(err);
      await expect(setEventResult(1, 'A')).rejects.toThrow('fail');
    });
  });

  describe('getEventById', () => {
    it('fetches event with creator', async () => {
      const ev = { id: 4, creator: { id: 2, name: 'Bob' } };
      (prisma.event.findUnique as any).mockResolvedValue(ev);
      const result = await getEventById(4);
      expect(prisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: 4 },
        include: { creator: { select: { id: true, name: true } } },
      });
      expect(result).toBe(ev);
    });
  });

  describe('createEvent', () => {
    it('creates event and sends notification when group exists', async () => {
      const data = {
        title: 'Title',
        description: 'Desc',
        question: 'Q',
        options: ['A'],
        group_id: 9,
      } as any;
      const created = { id: 99, groupId: 9, creator: { id: 1, name: 'Alice' } };
      (prisma.event.create as any).mockResolvedValue(created);
      (prisma.group.findUnique as any).mockResolvedValue({ name: 'My Group' });

      const result = await createEvent(data, 1);

      expect(prisma.event.create).toHaveBeenCalled();
      expect(prisma.group.findUnique).toHaveBeenCalledWith({
        where: { id: created.groupId },
        select: { name: true },
      });
      expect(sendNewEventNotificationsToGroupMembers).toHaveBeenCalledWith(
        { ...created, groupName: 'My Group' },
        1
      );
      expect(result).toBe(created);
    });

    it('skips notification when group missing', async () => {
      const data = { title: 'T', question: 'Q', options: [], group_id: 2 } as any;
      const created = { id: 1, groupId: 2, creator: { id: 1, name: 'A' } };
      (prisma.event.create as any).mockResolvedValue(created);
      (prisma.group.findUnique as any).mockResolvedValue(null);

      await createEvent(data, 1);

      expect(sendNewEventNotificationsToGroupMembers).not.toHaveBeenCalled();
    });
  });
});
