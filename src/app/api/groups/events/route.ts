import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/app/api/lib/auth';
import { isUserMemberOfGroup } from '@/app/api/services/groupService';
import { getEventsForGroup } from '@/app/api/services/eventService';

export async function GET(
  req: NextRequest,
  { params }: { params: { groupId: string } }
) {
  /* 1 — Auth & Param-Check */
  const user = await getCurrentUserFromRequest(req);
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = Number(params.groupId);
  if (!id) return NextResponse.json({ error: 'Bad group id' }, { status: 400 });

  /* 2 — Berechtigung */
  if (!(await isUserMemberOfGroup(user.id, id)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  /* 3 — Daten holen */
  try {
    const events = await getEventsForGroup(id);
    return NextResponse.json(events);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Server error while reading events' },
      { status: 500 }
    );
  }
}
