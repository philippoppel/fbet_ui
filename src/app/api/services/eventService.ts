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

    const { tips, options: prismaOptions, ...eventData } = event;

    const clientOptions =
      Array.isArray(prismaOptions) &&
      prismaOptions.every((opt) => typeof opt === 'string')
        ? (prismaOptions as string[])
        : [];

    return {
      ...eventData,
      options: clientOptions,
      awardedPoints,
    };
  });
}

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
