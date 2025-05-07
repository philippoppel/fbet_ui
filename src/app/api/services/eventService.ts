// src/app/api/services/eventService.ts
import { Prisma } from '@prisma/client';
import type { Event as PrismaEventFromPrismaClient } from '@prisma/client'; // Original Prisma Typ
import { prisma } from '@/app/api/lib/prisma';
// Importiere unsere angepassten Client-Typen
import type {
  EventCreate as AppEventCreate, // Dein EventCreate Typ
  EventPointDetail,
  Event as ClientEvent, // Unser erweiterter Event-Typ für den Client
} from '@/app/lib/types';

/**
 * Ruft alle Events für eine bestimmte Gruppen-ID ab,
 * inklusive der Informationen über vergebene Punkte.
 * @param groupId Die ID der Gruppe.
 * @returns Ein Promise, das ein Array von erweiterten Event-Objekten (ClientEvent) auflöst.
 */
export async function getEventsForGroup(
  groupId: number
): Promise<ClientEvent[]> {
  console.log(
    `[eventService] Getting events for groupId: ${groupId} including tip details.`
  );
  const eventsFromDb = await prisma.event.findMany({
    where: { groupId },
    orderBy: {
      // Wähle eine konsistente Sortierung, z.B. eventDateTime oder createdAt
      createdAt: 'desc', // oder eventDateTime: 'desc'
    },
    include: {
      tips: {
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
    },
  });

  const clientEvents: ClientEvent[] = eventsFromDb.map((event) => {
    const awardedPoints: EventPointDetail[] = event.tips.map((tip) => {
      let userName = `User ${tip.userId}`;
      if (tip.user.name && tip.user.name.trim() !== '') {
        userName = tip.user.name.trim();
      } else if (tip.user.email) {
        userName = tip.user.email.split('@')[0];
      }
      return {
        userId: tip.userId,
        userName: userName,
        selectedOption: tip.selectedOption,
        points: tip.points,
      };
    });

    const { tips, options: prismaOptions, ...eventData } = event;

    // Sichere Konvertierung von Prisma.JsonValue zu string[] | null
    let clientOptions: string[] | null = null;
    if (Array.isArray(prismaOptions)) {
      // Prüfe, ob alle Elemente Strings sind, bevor gecastet wird
      if (prismaOptions.every((opt) => typeof opt === 'string')) {
        clientOptions = prismaOptions as string[];
      } else {
        console.warn(
          `Event ${event.id} has options that are not all strings:`,
          prismaOptions
        );
        // Fallback: Optionen als null setzen oder eine leere Liste, je nach Anforderung
      }
    } else if (prismaOptions !== null) {
      console.warn(
        `Event ${event.id} has options that are not an array:`,
        prismaOptions
      );
    }

    return {
      ...eventData,
      options: clientOptions, // Jetzt mit dem korrekten Typ string[] | null
      awardedPoints,
    };
  });

  return clientEvents;
}

// --- Deine anderen Funktionen (getEventById, createEvent, setEventResult) ---
// Stelle sicher, dass die Rückgabetypen hier auch ggf. angepasst werden,
// falls sie den erweiterten ClientEvent-Typ zurückgeben sollen oder
// den reinen PrismaEventFromPrismaClient-Typ, je nach Anwendungsfall.
// Für createEvent und setEventResult ist PrismaEventFromPrismaClient als Rückgabetyp
// wahrscheinlich weiterhin passend, da sie nicht unbedingt die 'awardedPoints' direkt zurückgeben müssen.

export async function getEventById(
  eventId: number
): Promise<PrismaEventFromPrismaClient | null> {
  return prisma.event.findUnique({
    where: { id: eventId },
  });
}

export async function createEvent(
  eventData: AppEventCreate, // Nutzt dein EventCreate Typ
  creatorId: number
): Promise<PrismaEventFromPrismaClient> {
  // Gibt den Standard Prisma Event Typ zurück
  const dataToCreate: Prisma.EventCreateInput = {
    title: eventData.title,
    description: eventData.description,
    question: eventData.question,
    options: eventData.options, // eventData.options ist string[] und kompatibel mit Prisma.JsonValue
    group: { connect: { id: eventData.group_id } },
    creator: { connect: { id: creatorId } },
    // eventDateTime: eventData.eventDateTime ? new Date(eventData.eventDateTime) : undefined, // Beispiel
  };

  return prisma.event.create({
    data: dataToCreate,
  });
}

export async function setEventResult(
  eventId: number,
  winningOption: string
): Promise<PrismaEventFromPrismaClient | null> {
  // Gibt den Standard Prisma Event Typ zurück
  try {
    // Die Transaktion zum Setzen des Ergebnisses und Berechnen der Punkte
    // sollte idealerweise hier im Service stattfinden, nicht in der Route.
    // Fürs Erste belassen wir es bei der Aktualisierung des Events.
    // Die Punkteberechnung hast du ja in der events/result/route.ts.
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: { winningOption: winningOption },
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
