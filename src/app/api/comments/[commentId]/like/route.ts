// src/app/api/comments/[commentId]/like/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/api/lib/prisma';
import { getCurrentUserFromRequest } from '@/app/api/lib/auth';

// ---------- POST /api/comments/:commentId/like ----------
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const { commentId } = await params;
  const user = await getCurrentUserFromRequest(req);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const commentIdNum = Number(commentId);
  if (!commentIdNum || commentIdNum <= 0) {
    return NextResponse.json({ error: 'Invalid comment ID' }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existingLike = await tx.commentLike.findUnique({
        where: {
          uq_user_comment_like: { userId: user.id, commentId: commentIdNum },
        },
      });
      if (existingLike) throw new Error('Already liked');

      await tx.commentLike.create({
        data: { userId: user.id, commentId: commentIdNum },
      });

      await tx.eventComment.update({
        where: { id: commentIdNum },
        data: { likesCount: { increment: 1 } },
      });
    });

    return NextResponse.json(
      { success: true, message: 'Comment liked' },
      { status: 200 }
    );
  } catch (e: any) {
    if (
      e.message === 'Already liked' ||
      (e.code === 'P2002' && e.meta?.target?.includes('uq_user_comment_like'))
    ) {
      return NextResponse.json(
        { error: 'Comment already liked by this user.' },
        { status: 409 }
      );
    }

    console.error(`Error liking comment ${commentIdNum}:`, e);
    return NextResponse.json(
      { error: 'Failed to like comment due to an internal server error.' },
      { status: 500 }
    );
  }
}

// ---------- DELETE /api/comments/:commentId/like ----------
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const { commentId } = await params;
  const user = await getCurrentUserFromRequest(req);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const commentIdNum = Number(commentId);
  if (!commentIdNum || commentIdNum <= 0) {
    return NextResponse.json({ error: 'Invalid comment ID' }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const deletedLike = await tx.commentLike.deleteMany({
        where: { userId: user.id, commentId: commentIdNum },
      });

      if (deletedLike.count > 0) {
        await tx.eventComment.update({
          where: { id: commentIdNum },
          data: { likesCount: { decrement: 1 } },
        });

        return { unliked: true, message: 'Comment unliked successfully.' };
      }

      return { unliked: false, message: 'Like not found or already unliked.' };
    });

    if (!result.unliked) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: result.message },
      { status: 200 }
    );
  } catch (e: any) {
    console.error(`Error unliking comment ${commentIdNum}:`, e);
    return NextResponse.json(
      { error: 'Failed to unlike comment due to an internal server error.' },
      { status: 500 }
    );
  }
}
