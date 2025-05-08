// src/app/api/groups/[groupId]/route.ts
import {
  AuthenticatedUser,
  getCurrentUserFromRequest,
} from '@/app/api/lib/auth'; // Pfad ggf. anpassen
import { isUserMemberOfGroup } from '@/app/api/services/groupService'; // Pfad ggf. anpassen
import { prisma } from '@/app/api/lib/prisma'; // Pfad ggf. anpassen
import { NextRequest, NextResponse } from 'next/server';
// NEU: Korrekten Import für Prisma-Fehlertypen hinzufügen
import { Prisma } from '@prisma/client'; // Stellt Prisma.PrismaClientKnownRequestError bereit

// --- DEIN EXISTIERENDER GET HANDLER ---
export async function GET(
  req: NextRequest,
  { params }: { params: { groupId: string } }
) {
  const groupIdString = params.groupId;
  const groupId = parseInt(groupIdString, 10);

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
      where: {
        id: groupId,
      },
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    return NextResponse.json(group);
  } catch (err) {
    console.error(
      `GET /api/groups/[groupId] failed for group ${groupId}:`,
      err
    );
    return NextResponse.json(
      { error: 'Server error while reading group details' },
      { status: 500 }
    );
  }
}

// --- NEUER/KORRIGIERTER DELETE HANDLER ---
async function getGroupForOwner(groupId: number, userId: number) {
  return prisma.group.findUnique({
    where: {
      id: groupId,
      createdById: userId,
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = parseInt(params.groupId, 10);
    if (isNaN(groupId)) {
      return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
    }

    const group = await getGroupForOwner(groupId, currentUser.id);

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
        createdById: currentUser.id,
      },
    });

    return NextResponse.json(null, { status: 204 });
  } catch (error: unknown) {
    // Explizit 'unknown' für den error-Typ
    console.error(`Error in DELETE /api/groups/${params.groupId}:`, error);

    // Typüberprüfung für Prisma-spezifische Fehler
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Jetzt weiß TypeScript, dass 'error' hier vom Typ PrismaClientKnownRequestError ist
      // und Eigenschaften wie 'code' sicher zugegriffen werden können.
      if (error.code === 'P2025') {
        // Record to delete does not exist.
        return NextResponse.json(
          { error: 'Group to delete was not found (P2025).' },
          { status: 404 }
        );
      }
      // Hier könnten weitere spezifische Prisma-Fehlercodes behandelt werden
    }
    // Fallback für andere Fehler oder wenn es kein PrismaClientKnownRequestError ist
    return NextResponse.json(
      {
        error: 'Could not delete group.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
