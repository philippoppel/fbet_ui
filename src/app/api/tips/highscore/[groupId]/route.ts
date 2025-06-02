import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/api/lib/prisma';
import {
  AuthenticatedUser,
  getCurrentUserFromRequest,
} from '@/app/api/lib/auth';
import { calculateHighscoresForGroup } from '@/app/api/services/leadershipService';
import { isUserMemberOfGroup } from '@/app/api/services/groupService';
import type { HighscoreEntry } from '@/app/lib/types';

export async function GET(req: NextRequest) {
  const groupIdFromParam =
    req.nextUrl.searchParams.get('groupId') ??
    req.nextUrl.pathname.split('/').pop(); // fallback

  /* ---------- AUTH ---------- */
  let user: AuthenticatedUser | null = null;
  try {
    user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } catch (authCatchError) {
    console.error(
      `[ROUTE /api/tips/highscore/${groupIdFromParam}] CRITICAL: Error during auth:`,
      authCatchError
    );
    return NextResponse.json(
      { error: 'Authentication service error' },
      { status: 500 }
    );
  }

  /* ---------- CHECK GROUP MEMBERSHIP ---------- */
  const isMember = await isUserMemberOfGroup(
    user.id,
    parseInt(groupIdFromParam ?? '0', 10)
  );
  if (!isMember) {
    return NextResponse.json(
      { error: 'User is not a member of this group.' },
      { status: 403 }
    );
  }

  /* ---------- CALCULATE HIGHSCORE ---------- */
  try {
    const highscoresRaw = await calculateHighscoresForGroup(
      parseInt(groupIdFromParam ?? '0', 10),
      prisma
    );

    const highscores: HighscoreEntry[] = highscoresRaw.map((entry) => ({
      user_id: entry.userId,
      points: entry.totalPoints,
      name: entry.name ?? '',
      leaderSince: null,
    }));

    return NextResponse.json(
      {
        groupId: parseInt(groupIdFromParam ?? '0', 10),
        highscores,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      `[ROUTE /api/tips/highscore/${groupIdFromParam}] Error calculating highscores:`,
      error
    );
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Could not calculate highscores.', details: errorMessage },
      { status: 500 }
    );
  }
}
