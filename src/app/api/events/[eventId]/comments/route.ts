import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/api/lib/prisma';
import { getCurrentUserFromRequest } from '@/app/api/lib/auth';
import { z } from 'zod';

// Schema zur Validierung der Eingabedaten für einen Kommentar
const commentSchema = z
  .object({
    text: z.string().max(1000).optional(),
    gifUrl: z.string().url().optional(),
  })
  .refine((data) => data.text || data.gifUrl, {
    message: 'Either text or gifUrl must be provided',
    path: ['text', 'gifUrl'],
  });

/**
 * POST-Handler zum Erstellen eines neuen Kommentars für ein Event.
 */
export async function POST(req: NextRequest, context: any) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const eventId = parseInt(context.params.eventId, 10);
  if (isNaN(eventId)) {
    return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
  }

  let body;
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const validation = commentSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const { text, gifUrl } = validation.data;

  try {
    const createdComment = await prisma.eventComment.create({
      data: {
        text: text || null,
        gifUrl: gifUrl || null,
        userId: user.id,
        eventId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    return NextResponse.json(createdComment, { status: 201 });
  } catch (e) {
    console.error('Error creating comment:', e);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}

/**
 * GET-Handler zum Abrufen aller Kommentare für ein Event.
 */
export async function GET(req: NextRequest, context: any) {
  const eventId = parseInt(context.params.eventId, 10);
  if (isNaN(eventId)) {
    return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
  }

  try {
    const comments = await prisma.eventComment.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    return NextResponse.json(comments);
  } catch (e) {
    console.error('Error fetching comments:', e);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}
