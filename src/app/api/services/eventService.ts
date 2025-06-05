// src/app/api/services/eventService.ts
import { Prisma } from '@prisma/client';
import type { Event as PrismaEventFromPrismaClient } from '@prisma/client'; // Behalte diesen Alias für Klarheit
import { prisma } from '@/app/api/lib/prisma';

import type {
  EventCreate as AppEventCreate,
  EventPointDetail,
  Event as ClientEvent, // Dein Frontend-Event-Typ
  UserOut, // Importiere UserOut für den Creator-Typ
} from '@/app/lib/types';
import { sendNewEventNotificationsToGroupMembers } from '@/app/api/services/notificationService';

export async function getEventsForGroup(
  groupId: number
): Promise<ClientEvent[]> {
  console.log(
    `[eventService] Getting events for groupId: ${groupId} including tip and creator details.`
  );
  const eventsFromDb = await prisma.event.findMany({
    where: { groupId },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      tips: {
        // Beibehaltung der Tip-Details
        select: {
          userId: true,
          selectedOption: true,
          points: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      creator: {
        // NEU: Creator-Informationen mitladen
        select: {
          id: true,
          name: true,
          // email: true, // Füge Email hinzu, falls UserOut es für creator benötigt
        },
      },
    },
  });

  return eventsFromDb.map((event) => {
    const awardedPoints: EventPointDetail[] = event.tips.map((tip) => {
      let userName = `User ${tip.userId}`;
      if (tip.user.name && tip.user.name.trim() !== '') {
        userName = tip.user.name.trim();
      } else if (tip.user.email) {
        userName = tip.user.email.split('@')[0];
      }
      return {
        userId: tip.userId,
        userName,
        selectedOption: tip.selectedOption,
        points: tip.points,
      };
    });

    // Stelle sicher, dass prismaOptions korrekt behandelt wird
    const prismaOptions = event.options;
    const clientOptions =
      Array.isArray(prismaOptions) &&
      prismaOptions.every((opt) => typeof opt === 'string')
        ? (prismaOptions as string[])
        : Array.isArray(prismaOptions) && prismaOptions.length === 0 // Leeres Array ist auch gültig
          ? []
          : null; // Oder [] wenn null nicht erlaubt ist laut ClientEvent

    // Destrukturieren, nachdem prismaOptions extrahiert wurde
    const { tips, options, creator, ...eventData } = event;

    // Erstelle das Creator-Objekt gemäß der Definition in ClientEvent (Pick<UserOut, 'id' | 'name'>)
    const eventCreator: Pick<UserOut, 'id' | 'name'> = {
      id: creator.id,
      name: creator.name,
    };

    return {
      ...eventData,
      options: clientOptions,
      awardedPoints,
      creator: eventCreator, // NEU: Creator-Objekt hinzufügen
    };
  });
}

// ... (Rest der Datei bleibt gleich)

export async function getEventById(
  eventId: number
): Promise<PrismaEventFromPrismaClient | null> {
  return prisma.event.findUnique({
    where: { id: eventId },
    include: {
      // Optional: Creator hier auch mitladen, falls benötigt
      creator: {
        select: { id: true, name: true },
      },
    },
  });
}

export async function createEvent(
  eventData: AppEventCreate,
  creatorId: number
): Promise<PrismaEventFromPrismaClient> {
  // Rückgabetyp könnte auch ClientEvent sein, wenn Transformation gewünscht
  const dataToCreate: Prisma.EventCreateInput = {
    title: eventData.title,
    description: eventData.description,
    question: eventData.question,
    options: eventData.options as Prisma.JsonArray,
    group: { connect: { id: eventData.group_id } },
    creator: { connect: { id: creatorId } },
    tippingDeadline: eventData.tippingDeadline
      ? new Date(eventData.tippingDeadline)
      : undefined,
  };

  const newEvent = await prisma.event.create({
    data: dataToCreate,
    include: {
      // Wichtig, um den Creator für die Benachrichtigung und ggf. Rückgabe zu haben
      creator: { select: { id: true, name: true } },
    },
  });

  if (newEvent) {
    prisma.group
      .findUnique({ where: { id: newEvent.groupId } })
      .then((group) => {
        if (group) {
          const eventWithDetailsForNotification = {
            ...newEvent,
            groupName: group.name,
            // creatorName: newEvent.creator.name, // newEvent.creator ist jetzt verfügbar
          };
          sendNewEventNotificationsToGroupMembers(
            eventWithDetailsForNotification,
            creatorId
          ).catch((err) =>
            console.error(
              '[EventService] Error in sendNewEventNotificationsToGroupMembers:',
              err
            )
          );
        } else {
          console.error(
            `[EventService] Group not found for event ${newEvent.id} during notification dispatch.`
          );
        }
      })
      .catch((err) =>
        console.error(
          '[EventService] Error fetching group for notification dispatch:',
          err
        )
      );
  }
  // Wenn der Rückgabetyp ClientEvent sein soll, müsstest du hier ähnlich wie in getEventsForGroup transformieren.
  // Da PrismaEventFromPrismaClient zurückgegeben wird, ist die Struktur anders.
  return newEvent;
}

export async function setEventResult(
  eventId: number,
  winningOption: string
): Promise<PrismaEventFromPrismaClient | null> {
  try {
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: { winningOption },
      // include: { creator: { select: { id: true, name: true } } } // Falls ClientEvent zurückgegeben werden soll
    });
    return updatedEvent;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025' // "Record to update not found"
    ) {
      return null;
    }
    throw error;
  }
}
