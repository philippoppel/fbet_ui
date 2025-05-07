// src/app/api/tips/highscore/[groupId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  AuthenticatedUser,
  getCurrentUserFromRequest,
} from '@/app/api/lib/auth';
import { getHighscoreForGroup } from '@/app/api/services/highscoreService';
import { isUserMemberOfGroup } from '@/app/api/services/groupService';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;

  const user: AuthenticatedUser | null = await getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const groupIdNum = Number(groupId);
  if (isNaN(groupIdNum) || groupIdNum <= 0) {
    return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
  }

  try {
    const isMember = await isUserMemberOfGroup(user.id, groupIdNum);
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch (authError) {
    console.error('Authorization error in highscore route:', authError);
    return NextResponse.json(
      { error: 'Error during authorization' },
      { status: 500 }
    );
  }

  try {
    const highscore = await getHighscoreForGroup(groupIdNum);
    return NextResponse.json(highscore);
  } catch (e) {
    console.error('Error in getHighscoreForGroup route:', e);
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Server error while reading highscore', details: errorMessage },
      { status: 500 }
    );
  }
}
