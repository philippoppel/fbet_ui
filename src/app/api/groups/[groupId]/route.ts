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
  const { params } = context as { params: { groupId: string } };
  const groupId = parseInt(params.groupId, 10);

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
      `Authorization error for group ${groupId} by user ${currentUser?.id}:`,
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
    console.error(`GET /api/groups/${params.groupId} failed:`, err);
    return NextResponse.json(
      { error: 'Server error while reading group details' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: { groupId: string } }
) {
  const groupId = parseInt(context.params.groupId, 10);
  const json = await req.json();

  const parsed = groupUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await prisma.group.update({
    where: { id: groupId },
    data: { imageUrl: parsed.data.imageUrl ?? null }, // null → Bild löschen
  });

  return NextResponse.json(updated);
}

// --- DELETE Handler ---
export async function DELETE(req: NextRequest, context: any) {
  const { params } = context as { params: { groupId: string } };
  const groupIdString = params.groupId;

  try {
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = parseInt(groupIdString, 10);
    if (isNaN(groupId)) {
      return NextResponse.json(
        { error: `Invalid group ID: ${groupIdString}` },
        { status: 400 }
      );
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

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    console.error(`Error in DELETE /api/groups/${groupIdString}:`, error);

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
