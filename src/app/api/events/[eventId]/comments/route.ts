// src/app/api/events/[eventId]/comments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/api/lib/prisma';
import { getCurrentUserFromRequest } from '@/app/api/lib/auth';
import { z } from 'zod';

// Schema zur Validierung (unverändert)
const commentSchema = z
  .object({
    text: z.string().max(1000).optional(),
    gifUrl: z.string().url().optional(),
  })
  .refine((data) => data.text || data.gifUrl, {
    message: 'Either text or gifUrl must be provided',
    path: ['text', 'gifUrl'],
  });

// POST-Handler (Signatur anpassen)
export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } } // ANGEPASST
) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // const { eventId } = await context.params; // ALTE VERSION
  const { eventId } = params; // NEUE VERSION - direkter Zugriff
  const eventIdNum = parseInt(eventId, 10);

  if (isNaN(eventIdNum) || eventIdNum <= 0) {
    return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
  }

  // ... (Rest der POST-Logik bleibt gleich)
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
        gifUrl: gifUrl || null, // Stellt sicher, dass dein Schema gifUrl hier auch hat
        userId: user.id,
        eventId: eventIdNum,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const commentToReturn = {
      ...createdComment,
      likesCount: createdComment.likesCount || 0,
      likedByCurrentUser: false,
    };

    return NextResponse.json(commentToReturn, { status: 201 });
  } catch (e) {
    console.error(`Error creating comment for event ${eventIdNum}:`, e);
    // Überprüfe, ob der Fehler vom Prisma-Client wegen der fehlenden Spalte kommt
    if (
      e instanceof Error &&
      e.message.includes('column') &&
      e.message.includes('does not exist')
    ) {
      console.error(
        'Database schema mismatch detected while creating comment. Column might be missing.'
      );
      // Spezifischere Fehlermeldung für den Client
      return NextResponse.json(
        {
          error:
            'Failed to create comment due to a database configuration issue. Please check server logs.',
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}

// GET-Handler (Signatur anpassen)
export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } } // ANGEPASST
) {
  const user = await getCurrentUserFromRequest(req);
  // const { eventId } = await context.params; // ALTE VERSION
  const { eventId } = params; // NEUE VERSION - direkter Zugriff
  const eventIdNum = parseInt(eventId, 10);

  if (isNaN(eventIdNum) || eventIdNum <= 0) {
    return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
  }

  try {
    const commentsFromDb = await prisma.eventComment.findMany({
      where: { eventId: eventIdNum },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        likes: user
          ? {
              where: { userId: user.id },
              select: { userId: true },
            }
          : false, // Prisma: 'false' um Relation nicht zu laden, wenn kein User
      },
      orderBy: [{ likesCount: 'desc' }, { createdAt: 'asc' }],
    });

    const commentsToReturn = commentsFromDb.map((comment) => {
      const { likes, ...restOfComment } = comment;
      return {
        ...restOfComment,
        likedByCurrentUser: user ? (likes?.length ?? 0) > 0 : false,
      };
    });

    return NextResponse.json(commentsToReturn);
  } catch (e) {
    console.error(`Error fetching comments for event ${eventIdNum}:`, e);
    // Spezifische Fehlerbehandlung für Prisma P2022 (fehlende Spalte)
    if (e instanceof Error && 'code' in e && (e as any).code === 'P2022') {
      console.error(
        'Prisma Error P2022: A required column is missing in the database.',
        (e as any).meta
      );
      return NextResponse.json(
        {
          error:
            'Database schema mismatch. A column is missing. Please check server logs.',
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}
