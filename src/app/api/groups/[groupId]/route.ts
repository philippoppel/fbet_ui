// src/app/api/groups/[groupId]/route.ts
import {
  AuthenticatedUser,
  getCurrentUserFromRequest,
} from '@/app/api/lib/auth';
import { isUserMemberOfGroup } from '@/app/api/services/groupService';
import { prisma } from '@/app/api/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { groupUpdateSchema } from '@/app/api/lib/groupSchema';

// --- GET Handler ---
export async function GET(req: NextRequest, context: any) {
  const { groupId } = await context.params;
  const groupIdNum = parseInt(groupId, 10);

  if (isNaN(groupIdNum) || groupIdNum <= 0) {
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
      where: { id: groupIdNum },
      select: { createdById: true, id: true },
    });

    if (!groupForAuthCheck) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const isMember = await isUserMemberOfGroup(currentUser.id, groupIdNum);

    if (!isMember && groupForAuthCheck.createdById !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch (authError) {
    console.error(
      `Authorization error for group ${groupIdNum} by user ${currentUser?.id}:`,
      authError
    );
    return NextResponse.json(
      { error: 'Error during authorization check' },
      { status: 500 }
    );
  }

  try {
    const group = await prisma.group.findUnique({
      where: { id: groupIdNum },
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (err) {
    console.error(`GET /api/groups/${groupId} failed:`, err);
    return NextResponse.json(
      { error: 'Server error while reading group details' },
      { status: 500 }
    );
  }
}

// --- PATCH Handler ---
export async function PATCH(req: NextRequest, context: any) {
  const { groupId } = await context.params;
  const groupIdNum = parseInt(groupId, 10);
  const json = await req.json();

  const currentUser = await getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const groupToPatch = await prisma.group.findUnique({
    where: { id: groupIdNum },
    select: { createdById: true },
  });

  if (!groupToPatch) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  // Beispiel für Berechtigungsprüfung:
  // if (groupToPatch.createdById !== currentUser.id) {
  //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  // }

  const parsed = groupUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.group.update({
      where: { id: groupIdNum },
      data: { imageUrl: parsed.data.imageUrl ?? null },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(`PATCH /api/groups/${groupId} failed:`, error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return NextResponse.json(
        { error: 'Group not found to update' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Server error while updating group' },
      { status: 500 }
    );
  }
}

// --- DELETE Handler ---
export async function DELETE(req: NextRequest, context: any) {
  const { groupId } = await context.params;
  const groupIdNum = parseInt(groupId, 10);

  try {
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isNaN(groupIdNum) || groupIdNum <= 0) {
      return NextResponse.json(
        { error: `Invalid group ID: ${groupId}` },
        { status: 400 }
      );
    }

    const group = await prisma.group.findUnique({
      where: { id: groupIdNum },
      select: { createdById: true },
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (group.createdById !== currentUser.id) {
      return NextResponse.json(
        { error: 'User not authorized to delete this group' },
        { status: 403 }
      );
    }

    await prisma.group.delete({
      where: { id: groupIdNum },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    console.error(`Error in DELETE /api/groups/${groupId}:`, error);

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
