import { vi, describe, it, expect, afterEach } from 'vitest';

vi.mock('web-push', () => ({ default: { setVapidDetails: vi.fn(), sendNotification: vi.fn() } }));
vi.mock('@/app/api/lib/prisma', () => ({
  prisma: {
    groupMembership: { findMany: vi.fn() },
    pushSubscription: { delete: vi.fn() },
  },
}));

const { prisma } = await import('@/app/api/lib/prisma');
const webPush = (await import('web-push')).default as any;
const { sendNewEventNotificationsToGroupMembers } = await import('@/app/api/services/notificationService');

describe('sendNewEventNotificationsToGroupMembers', () => {
  afterEach(() => {
    vi.resetAllMocks();
    delete process.env.VAPID_PUBLIC_KEY;
  });

  it('does nothing when vapid key missing', async () => {
    await sendNewEventNotificationsToGroupMembers({ id: 1, groupId: 2, groupName: 'G', title: 'E' } as any, 1);
    expect(prisma.groupMembership.findMany).not.toHaveBeenCalled();
  });

  it('sends notifications to members', async () => {
    process.env.VAPID_PUBLIC_KEY = 'x';
    prisma.groupMembership.findMany.mockResolvedValue([
      { user: { id: 2, pushSubscriptions: [{ id: 1, endpoint: 'e', p256dh: 'd', auth: 'a' }] } },
    ]);
    await sendNewEventNotificationsToGroupMembers({ id: 1, groupId: 2, groupName: 'G', title: 'E' } as any, 1);
    expect(webPush.sendNotification).toHaveBeenCalled();
  });
});
