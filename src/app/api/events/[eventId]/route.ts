import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/api/lib/prisma';
import { getCurrentUserFromRequest } from '@/app/api/lib/auth';
import { Prisma } from '@prisma/client';

// --- GET Handler ---
export async function GET(req: NextRequest, context: any) {
  const eventId = parseInt(context.params.eventId, 10);
  if (isNaN(eventId)) {
    return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
  }

  const currentUser = await getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { group: { select: { createdById: true } } },
    });

    if (!event || !event.group) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const isCreator = event.createdById === currentUser.id;
    const isGroupAdmin = event.group.createdById === currentUser.id;

    if (!isCreator && !isGroupAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(event);
  } catch (err) {
    console.error('GET /api/events/[eventId] failed:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// --- DELETE Handler ---
export async function DELETE(req: NextRequest, context: any) {
  const eventIdString = context.params.eventId;
  const eventId = parseInt(eventIdString, 10);
  if (isNaN(eventId)) {
    return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
  }

  try {
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { group: { select: { createdById: true } } },
    });

    if (!event || !event.group) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const isCreator = event.createdById === currentUser.id;
    const isGroupAdmin = event.group.createdById === currentUser.id;

    if (!isCreator && !isGroupAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.event.delete({ where: { id: eventId } });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('DELETE /api/events/[eventId] failed:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Event not found (P2025)' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Could not delete event', details: error.message },
      { status: 500 }
    );
  }
}
