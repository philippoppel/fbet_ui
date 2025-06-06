import { Prisma, Event as PrismaEvent } from '@prisma/client';
import { prisma } from '@/app/api/lib/prisma';
import {
  EventCreate as AppEventCreate,
  EventPointDetail,
  Event as ClientEvent,
  UserOut,
} from '@/app/lib/types';
import { sendNewEventNotificationsToGroupMembers } from '@/app/api/services/notificationService';

export async function getEventsForGroup(
  groupId: number
): Promise<ClientEvent[]> {
  const events = await prisma.event.findMany({
    where: { groupId },
    orderBy: { createdAt: 'desc' },
    include: {
      tips: {
        select: {
          userId: true,
          selectedOption: true,
          points: true,
          wildcardGuess: true,
          wildcardPoints: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      creator: { select: { id: true, name: true } },
    },
  });

  return events.map((e) => {
    const awardedPoints: EventPointDetail[] = e.tips.map((t) => ({
      userId: t.userId,
      userName:
        t.user.name?.trim() ||
        t.user.email?.split('@')[0] ||
        `User ${t.userId}`,
      selectedOption: t.selectedOption,
      wildcardGuess: t.wildcardGuess,
      points: t.points,
      wildcardPoints: t.wildcardPoints,
    }));

    const options =
      Array.isArray(e.options) && e.options.every((o) => typeof o === 'string')
        ? (e.options as string[])
        : [];

    const { tips, options: _, creator, ...rest } = e;

    return {
      ...rest,
      options,
      awardedPoints,
      creator: { id: creator.id, name: creator.name } as Pick<
        UserOut,
        'id' | 'name'
      >,
      hasWildcard: e.hasWildcard,
      wildcardType: e.wildcardType,
      wildcardPrompt: e.wildcardPrompt,
      wildcardAnswer: e.wildcardAnswer,
    };
  });
}

export function getEventById(id: number): Promise<PrismaEvent | null> {
  return prisma.event.findUnique({
    where: { id },
    include: { creator: { select: { id: true, name: true } } },
  });
}

export async function createEvent(
  data: AppEventCreate,
  creatorId: number
): Promise<PrismaEvent> {
  const newEvent = await prisma.event.create({
    data: {
      title: data.title,
      description: data.description,
      question: data.question,
      options: data.options as Prisma.JsonArray,
      tippingDeadline: data.tippingDeadline
        ? new Date(data.tippingDeadline)
        : null,
      hasWildcard: data.has_wildcard ?? false,
      wildcardType: data.wildcard_type ?? null,
      wildcardPrompt: data.wildcard_prompt ?? null,
      group: { connect: { id: data.group_id } },
      creator: { connect: { id: creatorId } },
    },
    include: { creator: { select: { id: true, name: true } } },
  });

  const group = await prisma.group.findUnique({
    where: { id: newEvent.groupId },
    select: { name: true },
  });

  if (group) {
    await sendNewEventNotificationsToGroupMembers(
      { ...newEvent, groupName: group.name },
      creatorId
    ).catch((e) =>
      console.error('[eventService] push notification failed:', e)
    );
  }

  return newEvent;
}

export async function setEventResult(
  id: number,
  winningOption: string,
  wildcardAnswer?: string | null
): Promise<PrismaEvent | null> {
  try {
    return await prisma.event.update({
      where: { id },
      data: { winningOption, wildcardAnswer },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025')
      return null;
    throw e;
  }
}
