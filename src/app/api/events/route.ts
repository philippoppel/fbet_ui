import { NextRequest, NextResponse } from 'next/server';
import { eventCreateSchema, EventCreateInput } from '../lib/eventSchema';
import { prisma } from '../lib/prisma';
import { getCurrentUserFromRequest } from '../lib/auth';
import { isUserMemberOfGroup } from '../services/groupService';
import { createEvent as createEventService } from '../services/eventService';

export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = eventCreateSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  const dto: EventCreateInput = parsed.data;

  const group = await prisma.group.findUnique({
    where: { id: dto.group_id },
    select: { id: true },
  });
  if (!group)
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });

  if (!(await isUserMemberOfGroup(user.id, dto.group_id)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const newEvent = await createEventService(dto, user.id);
  return NextResponse.json(newEvent, { status: 201 });
}
