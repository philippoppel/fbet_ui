// src/app/api/groups-with-open-events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/app/api/lib/auth';
import { prisma } from '@/app/api/lib/prisma';

export async function GET(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const groups = await prisma.group.findMany({
      where: {
        memberships: {
          some: { userId: user.id },
        },
      },
      include: {
        events: {
          where: { winningOption: null },
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    const result = groups
      .filter((g) => g.events.length > 0)
      .map((g) => ({
        groupId: g.id,
        groupName: g.name,
        openEvents: g.events,
      }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Fehler beim Abrufen offener Events:', error);
    return NextResponse.json(
      { error: 'Serverfehler beim Abrufen offener Events' },
      { status: 500 }
    );
  }
}
