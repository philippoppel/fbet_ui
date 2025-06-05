// src/app/api/events/[eventId]/comments/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/api/lib/prisma';
import { getCurrentUserFromRequest } from '@/app/api/lib/auth';
import { z } from 'zod';

// Schema
const commentSchema = z
  .object({
    text: z.string().max(1000).optional(),
    gifUrl: z.string().url().optional(),
  })
  .refine((data) => data.text || data.gifUrl, {
    message: 'Either text or gifUrl must be provided',
    path: ['text', 'gifUrl'],
  });

// --- POST Handler ---
export async function POST(req: NextRequest) {
  // Extract eventId from URL
  const url = new URL(req.url);
  const eventId = url.pathname.split('/').slice(-2)[0];
  const eventIdNum = parseInt(eventId, 10);

  if (isNaN(eventIdNum) || eventIdNum <= 0) {
    return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
  }

  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}

// --- GET Handler ---
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const eventId = url.pathname.split('/').slice(-2)[0];
  const eventIdNum = parseInt(eventId, 10);

  if (isNaN(eventIdNum) || eventIdNum <= 0) {
    return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
  }

  const user = await getCurrentUserFromRequest(req);

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
          : false,
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
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}
