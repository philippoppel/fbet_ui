import {
  AuthenticatedUser,
  getCurrentUserFromRequest,
} from '@/app/api/lib/auth';
import { isUserMemberOfGroup } from '@/app/api/services/groupService';
import { prisma } from '@/app/api/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

// --- GET Handler ---
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> } // <-- MODIFIED HERE
) {
  const resolvedParams = await params; // <-- ADDED HERE
  const groupId = parseInt(resolvedParams.groupId, 10); // <-- MODIFIED HERE

  if (isNaN(groupId) || groupId <= 0) {
    return NextResponse.json(
      { error: 'Invalid group ID format' },
      { status: 400 }
    );
  }

  const currentUser: AuthenticatedUser | null =
    await getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const groupForAuthCheck = await prisma.group.findUnique({
      where: { id: groupId },
      select: { createdById: true, id: true },
    });

    if (!groupForAuthCheck) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const isMember = await isUserMemberOfGroup(currentUser.id, groupId);

    if (!isMember && groupForAuthCheck.createdById !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch (authError) {
    console.error(
      `Authorization error for group ${groupId} by user ${currentUser.id}:`,
      authError
    );
    return NextResponse.json(
      { error: 'Error during authorization check' },
      { status: 500 }
    );
  }

  try {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (err) {
    console.error(`GET /api/groups/[groupId] failed:`, err);
    return NextResponse.json(
      { error: 'Server error while reading group details' },
      { status: 500 }
    );
  }
}

// --- DELETE Handler ---
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> } // <-- MODIFIED HERE
) {
  try {
    const resolvedParams = await params; // <-- ADDED HERE
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = parseInt(resolvedParams.groupId, 10); // <-- MODIFIED HERE
    if (isNaN(groupId)) {
      return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
    }

    const group = await prisma.group.findUnique({
      where: {
        id: groupId,
        createdById: currentUser.id,
      },
    });

    if (!group) {
      return NextResponse.json(
        {
          error: 'Group not found or user not authorized to delete this group',
        },
        { status: 404 }
      );
    }

    await prisma.group.delete({
      where: {
        id: groupId,
      },
    });

    return NextResponse.json(null, { status: 204 });
  } catch (error: unknown) {
    // It's good practice to log with the specific param if available before awaiting
    // However, if awaiting params fails, resolvedParams won't be available.
    // Consider how you want to log if `await params` itself throws.
    let groupIdForLogging = 'unknown';
    try {
      // Attempt to resolve params for logging, but don't let it break the main error handling
      const p = await params;
      groupIdForLogging = p.groupId;
    } catch {
      /* ignore if params can't be resolved here */
    }

    console.error(`Error in DELETE /api/groups/${groupIdForLogging}:`, error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Group to delete was not found (P2025).' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Could not delete group.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
