import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/app/api/lib/auth';
import { prisma } from '@/app/api/lib/prisma';

export async function GET(req: NextRequest) {
  const routeName = '/api/tips/all';
  console.log(`[ROUTE ${routeName}] GET request received.`);

  const currentUser = await getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tips = await prisma.tip.findMany({
      where: { userId: currentUser.id },
      select: {
        eventId: true,
        selectedOption: true,
        id: true,
      },
    });

    console.log(`[ROUTE ${routeName}] Returned ${tips.length} tips.`);
    return NextResponse.json(tips, { status: 200 });
  } catch (err) {
    console.error(`[ROUTE ${routeName}] DB error:`, err);
    return NextResponse.json(
      { error: 'Failed to load tips across all groups.' },
      { status: 500 }
    );
  }
}
