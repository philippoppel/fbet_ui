// src/app/api/services/notificationService.ts
import webPush from 'web-push';
import { prisma } from '@/app/api/lib/prisma';
import type {
  Event as PrismaEvent,
  Group as PrismaGroup,
  PushSubscription as PrismaPushSubscription,
} from '@prisma/client';

// VAPID Details Konfiguration (einmalig beim Start des Servers/Moduls)
if (
  process.env.VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY &&
  process.env.VAPID_SUBJECT
) {
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  console.log('[NotificationService] VAPID details configured.');
} else {
  console.warn(
    '[NotificationService] VAPID keys are not fully configured in environment variables. Push notifications will not work.'
  );
}

interface EventForNotification extends PrismaEvent {
  groupName: string; // Wir fügen den Gruppennamen hinzu
}

export async function sendNewEventNotificationsToGroupMembers(
  event: EventForNotification,
  creatorId: number
): Promise<void> {
  if (!process.env.VAPID_PUBLIC_KEY) {
    console.warn(
      '[NotificationService] Cannot send push: VAPID_PUBLIC_KEY not set.'
    );
    return;
  }

  try {
    const groupMembers = await prisma.groupMembership.findMany({
      where: {
        groupId: event.groupId,
        userId: { not: creatorId }, // Benachrichtige nicht den Ersteller des Events
      },
      include: {
        user: {
          select: {
            id: true,
            pushSubscriptions: true, // Lädt alle Push-Subscriptions des Nutzers
          },
        },
      },
    });

    const notificationPayload = JSON.stringify({
      title: `Neues Event in Gruppe "${event.groupName}"`,
      body: `"${event.title}" - jetzt tippen!`,
      icon: '/icon1.png', // Stelle sicher, dass dieses Icon in /public existiert
      data: {
        // Daten, die der Service Worker beim Klick verwenden kann
        url: `/dashboard?group=<span class="math-inline">\{event\.groupId\}&event\=</span>{event.id}`,
      },
    });

    for (const member of groupMembers) {
      if (
        member.user.pushSubscriptions &&
        member.user.pushSubscriptions.length > 0
      ) {
        member.user.pushSubscriptions.forEach(
          async (subscription: PrismaPushSubscription) => {
            try {
              await webPush.sendNotification(
                {
                  // Die gespeicherte Subscription des Nutzers
                  endpoint: subscription.endpoint,
                  keys: {
                    p256dh: subscription.p256dh,
                    auth: subscription.auth,
                  },
                },
                notificationPayload
              );
              console.log(
                `[NotificationService] Push sent to user ${member.user.id} for event ${event.id}`
              );
            } catch (error: any) {
              console.error(
                `[NotificationService] Error sending push to user ${member.user.id} (sub ID: ${subscription.id}):`,
                error.statusCode,
                error.message
              );
              // Ungültige Subscription entfernen (z.B. Browser gewechselt, deinstalliert)
              if (
                error.statusCode === 404 ||
                error.statusCode === 410 ||
                error.statusCode === 403
              ) {
                console.log(
                  `[NotificationService] Deleting invalid subscription ${subscription.id} for user ${member.user.id}.`
                );
                await prisma.pushSubscription
                  .delete({ where: { id: subscription.id } })
                  .catch((delErr) => {
                    console.error(
                      `[NotificationService] Failed to delete subscription ${subscription.id}:`,
                      delErr
                    );
                  });
              }
            }
          }
        );
      }
    }
  } catch (error) {
    console.error(
      '[NotificationService] Failed to prepare or send new event notifications:',
      error
    );
  }
}

export async function sendTestNotificationToUser(
  userId: number
): Promise<void> {
  if (!process.env.VAPID_PUBLIC_KEY) {
    console.warn(
      '[NotificationService] Cannot send push: VAPID_PUBLIC_KEY not set.'
    );
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { pushSubscriptions: true },
    });

    if (!user || user.pushSubscriptions.length === 0) {
      console.warn(
        `[NotificationService] No push subscription found for user ${userId}.`
      );
      return;
    }

    const payload = JSON.stringify({
      title: 'fbet Testbenachrichtigung',
      body: 'Push-Einrichtung erfolgreich!',
      icon: '/icon1.png',
      data: { url: '/' },
    });

    await Promise.all(
      user.pushSubscriptions.map((sub) =>
        webPush
          .sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          )
          .catch((err) => {
            console.error(
              `[NotificationService] Error sending test push to user ${userId}:`,
              err
            );
          })
      )
    );
  } catch (error) {
    console.error(
      `[NotificationService] Failed to send test notification to user ${userId}:`,
      error
    );
  }
}
