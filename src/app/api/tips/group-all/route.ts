import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/api/lib/prisma';
import { getCurrentUserFromRequest } from '@/app/api/lib/auth';

export async function GET(req: NextRequest) {
  const routeName = '/api/tips/group-all';
  console.log(`[${routeName}] GET called`);

  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const groupId = parseInt(
    new URL(req.url).searchParams.get('groupId') || '',
    10
  );
  if (isNaN(groupId)) {
    return NextResponse.json(
      { error: 'Missing or invalid groupId' },
      { status: 400 }
    );
  }

  const membership = await prisma.groupMembership.findUnique({
    where: {
      uq_user_group: {
        userId: user.id,
        groupId,
      },
    },
  });

  if (!membership) {
    return NextResponse.json(
      { error: 'Not a member of this group' },
      { status: 403 }
    );
  }

  try {
    const tips = await prisma.tip.findMany({
      where: {
        event: {
          groupId,
          winningOption: null,
        },
      },
      select: {
        eventId: true,
        selectedOption: true,
        userId: true,
        user: {
          select: { name: true },
        },
      },
    });

    const grouped: Record<
      number,
      { userId: number; userName: string | null; selectedOption: string }[]
    > = {};

    tips.forEach((tip) => {
      if (!grouped[tip.eventId]) grouped[tip.eventId] = [];
      grouped[tip.eventId].push({
        userId: tip.userId,
        userName: tip.user?.name || null,
        selectedOption: tip.selectedOption,
      });
    });

    return NextResponse.json(grouped);
  } catch (e) {
    console.error(`[${routeName}] DB Error:`, e);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
