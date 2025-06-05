// src/app/api/comments/[commentId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/api/lib/prisma';
import { getCurrentUserFromRequest } from '@/app/api/lib/auth';

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
    const comment = await prisma.eventComment.findUnique({
      where: { id: commentIdNum },
    });

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Hier könntest du noch eine Admin-Rolle prüfen: if (comment.userId !== user.id && !user.isAdmin)
    if (comment.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own comments' },
        { status: 403 }
      );
    }

    // Prisma's onDelete: Cascade auf CommentLike sollte assoziierte Likes automatisch löschen.
    await prisma.eventComment.delete({
      where: { id: commentIdNum },
    });

    // Hier könntest du einen Event für Echtzeit-Updates auslösen
    // eventEmitter.emit(`comment_${commentIdNum}_deleted`, { commentId: commentIdNum });

    return NextResponse.json(
      { success: true, message: 'Comment deleted' },
      { status: 200 }
    );
  } catch (e) {
    console.error(`Error deleting comment ${commentIdNum}:`, e);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
