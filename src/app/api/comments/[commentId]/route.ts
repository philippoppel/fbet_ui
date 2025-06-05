// src/app/api/comments/[commentId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/api/lib/prisma';
import { getCurrentUserFromRequest } from '@/app/api/lib/auth';

export async function DELETE(req: NextRequest) {
  // Extract commentId from URL
  const url = new URL(req.url);
  const commentId = url.pathname.split('/').slice(-1)[0];
  const commentIdNum = parseInt(commentId, 10);

  if (isNaN(commentIdNum) || commentIdNum <= 0) {
    return NextResponse.json({ error: 'Invalid comment ID' }, { status: 400 });
  }

  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const comment = await prisma.eventComment.findUnique({
      where: { id: commentIdNum },
    });

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check if user is owner of the comment
    if (comment.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own comments' },
        { status: 403 }
      );
    }

    // Delete the comment (assumes cascade on likes is configured)
    await prisma.eventComment.delete({
      where: { id: commentIdNum },
    });

    // Optionally emit event for real-time updates
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
