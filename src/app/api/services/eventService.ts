// src/app/api/services/eventService.ts
import { Prisma } from '@prisma/client';
import type { Event as PrismaEventFromPrismaClient } from '@prisma/client';
import { prisma } from '@/app/api/lib/prisma';

import type {
  EventCreate as AppEventCreate,
  EventPointDetail,
  Event as ClientEvent,
} from '@/app/lib/types';

export async function getEventsForGroup(
  groupId: number
): Promise<ClientEvent[]> {
  console.log(
    `[eventService] Getting events for groupId: ${groupId} including tip details.`
  );
  const eventsFromDb = await prisma.event.findMany({
    where: { groupId },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      tips: {
        select: {
          userId: true,
          selectedOption: true,
          points: true,
          user: {
            // tip.user wird vom Typ { id, name, email } | null sein, wenn die Relation optional ist
            select: {
              id: true,
              name: true, // Kann auch null sein, je nach deinem User-Modell
              email: true,
            },
          },
        },
      },
    },
  });

  return eventsFromDb.map((event) => {
    const awardedPoints: EventPointDetail[] = event.tips
      .filter((tip) => tip.userId !== null && tip.user !== null) // Expliziter Check auf tip.user !== null
      .map((tip) => {
        // Nach dem Filter ist tip.userId sicher eine Zahl und tip.user sicher nicht null.
        // TypeScript sollte dies jetzt besser verstehen, aber wir verwenden trotzdem Optional Chaining für Robustheit.

        let userName = `User ${tip.userId}`; // Fallback

        // Verwende Optional Chaining für den Zugriff auf tip.user Eigenschaften
        const usersActualName = tip.user?.name?.trim(); // Gibt undefined zurück, wenn user oder name null/undefined ist oder name leer ist
        const usersActualEmail = tip.user?.email;

        if (usersActualName) {
          userName = usersActualName;
        } else if (usersActualEmail) {
          userName = usersActualEmail.split('@')[0];
        }

        const actualPoints: number = tip.points === null ? 0 : tip.points;

        return {
          userId: tip.userId as number, // Sicher nach Filter
          userName,
          selectedOption: tip.selectedOption,
          points: actualPoints,
        };
      });

    const { tips, options: prismaOptions, ...eventData } = event;

    const clientOptions: string[] =
      Array.isArray(prismaOptions) &&
      prismaOptions.every((opt): opt is string => typeof opt === 'string')
        ? prismaOptions
        : [];

    return {
      ...eventData,
      options: clientOptions,
      awardedPoints,
    };
  });
}

// Der Rest der Datei bleibt unverändert:
export async function getEventById(
  eventId: number
): Promise<PrismaEventFromPrismaClient | null> {
  return prisma.event.findUnique({
    where: { id: eventId },
  });
}

export async function createEvent(
  eventData: AppEventCreate,
  creatorId: number
): Promise<PrismaEventFromPrismaClient> {
  const dataToCreate: Prisma.EventCreateInput = {
    title: eventData.title,
    description: eventData.description,
    question: eventData.question,
    options: eventData.options,
    group: { connect: { id: eventData.group_id } },
    creator: { connect: { id: creatorId } },
  };

  return prisma.event.create({
    data: dataToCreate,
  });
}

export async function setEventResult(
  eventId: number,
  winningOption: string
): Promise<PrismaEventFromPrismaClient | null> {
  try {
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: { winningOption },
    });
    return updatedEvent;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return null;
    }
    throw error;
  }
}
