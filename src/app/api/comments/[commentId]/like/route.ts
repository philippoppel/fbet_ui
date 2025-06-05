// src/app/api/comments/[commentId]/like/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/api/lib/prisma';
import { getCurrentUserFromRequest } from '@/app/api/lib/auth';

export async function POST(
  req: NextRequest,
  context: { params: { commentId: string } }
) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { commentId } = context.params;
  const commentIdNum = parseInt(commentId, 10);

  if (isNaN(commentIdNum) || commentIdNum <= 0) {
    return NextResponse.json({ error: 'Invalid comment ID' }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Prüfen, ob der Like bereits existiert, um Duplikate zu vermeiden (obwohl unique constraint dies auch tut)
      const existingLike = await tx.commentLike.findUnique({
        where: {
          uq_user_comment_like: {
            userId: user.id,
            commentId: commentIdNum,
          },
        },
      });

      if (existingLike) {
        // User hat bereits geliked, hier könnte man einen Fehler werfen oder einfach nichts tun
        // Für den Fall, dass der Client dies nicht erwartet, ist ein Fehler besser.
        // Oder, wenn es als Toggle gedacht ist, wäre dies der "Unlike"-Pfad, aber wir haben DELETE dafür.
        // Hier gehen wir davon aus, dass POST immer "liken" bedeutet.
        // Man könnte auch den aktuellen Like-Status zurückgeben.
        // Fürs Erste: Wenn Like existiert, keine Aktion und Erfolg melden oder Fehler für "already liked".
        // Wir gehen davon aus, der Client ruft POST nur auf, wenn nicht geliked.
        throw new Error('Already liked'); // Wird unten als 409 Conflict behandelt
      }

      await tx.commentLike.create({
        data: {
          userId: user.id,
          commentId: commentIdNum,
        },
      });

      await tx.eventComment.update({
        where: { id: commentIdNum },
        data: {
          likesCount: { increment: 1 },
        },
      });
    });
    // Hier könntest du einen Event für Echtzeit-Updates auslösen
    // eventEmitter.emit(`comment_${commentIdNum}_liked`, { commentId: commentIdNum, userId: user.id, newLikesCount });
    return NextResponse.json(
      { success: true, message: 'Comment liked' },
      { status: 200 }
    );
  } catch (e: any) {
    if (
      e.message === 'Already liked' ||
      (e.code === 'P2002' && e.meta?.target?.includes('uq_user_comment_like'))
    ) {
      // P2002 ist der Prisma-Code für Unique Constraint Violation
      return NextResponse.json(
        { error: 'Comment already liked by user or like attempt failed.' },
        { status: 409 }
      ); // 409 Conflict
    }
    console.error(`Error liking comment ${commentIdNum}:`, e);
    return NextResponse.json(
      { error: 'Failed to like comment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: { commentId: string } }
) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { commentId } = context.params;
  const commentIdNum = parseInt(commentId, 10);

  if (isNaN(commentIdNum) || commentIdNum <= 0) {
    return NextResponse.json({ error: 'Invalid comment ID' }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const deletedLike = await tx.commentLike.deleteMany({
        // deleteMany, falls der Like nicht existiert (robust)
        where: {
          userId: user.id,
          commentId: commentIdNum,
        },
      });

      if (deletedLike.count > 0) {
        await tx.eventComment.update({
          where: { id: commentIdNum },
          data: {
            likesCount: { decrement: 1 },
          },
        });
        return { unliked: true };
      }
      return { unliked: false, message: 'Like not found or already unliked' }; // Kein Like zum Entfernen gefunden
    });

    if (!result.unliked) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 404 }
      ); // Kein Like zum Entfernen gefunden
    }
    // Hier könntest du einen Event für Echtzeit-Updates auslösen
    // eventEmitter.emit(`comment_${commentIdNum}_unliked`, { commentId: commentIdNum, userId: user.id, newLikesCount });
    return NextResponse.json(
      { success: true, message: 'Comment unliked' },
      { status: 200 }
    );
  } catch (e) {
    console.error(`Error unliking comment ${commentIdNum}:`, e);
    return NextResponse.json(
      { error: 'Failed to unlike comment' },
      { status: 500 }
    );
  }
}
