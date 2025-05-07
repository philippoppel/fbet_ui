// src/app/api/groups/[groupId]/route.ts
// DIESER CODE LÄDT JETZT GRUPPENDETAILS, NICHT EVENTS!
import {
  AuthenticatedUser,
  getCurrentUserFromRequest,
} from '@/app/api/lib/auth';
import { isUserMemberOfGroup } from '@/app/api/services/groupService';
import { prisma } from '@/app/api/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
// Passe den Pfad zu deinem Prisma-Client und deinen Auth-Helfern an

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId: groupIdString } = await params;
  const groupId = parseInt(groupIdString, 10);

  // 1. Validierung der groupId
  if (isNaN(groupId) || groupId <= 0) {
    return NextResponse.json(
      { error: 'Invalid group ID format' },
      { status: 400 }
    );
  }

  // 2. Authentifizierung
  const currentUser: AuthenticatedUser | null =
    await getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 3. Autorisierung (Beispiel: User muss Mitglied sein oder Ersteller)
  try {
    const isMember = await isUserMemberOfGroup(currentUser.id, groupId);
    // Wichtig: Prüfen, ob die Gruppe überhaupt existiert, bevor man createdById prüft
    const groupForAuthCheck = await prisma.group.findUnique({
      where: { id: groupId },
      select: { createdById: true },
    });

    if (!groupForAuthCheck) {
      // Gruppe nicht gefunden, aber isUserMemberOfGroup würde auch false liefern.
      // Ein expliziter Check hier ist gut, bevor man auf groupForAuthCheck.createdById zugreift.
      // Der spätere findUnique wird das ohnehin als 404 behandeln.
    }

    if (!isMember && groupForAuthCheck?.createdById !== currentUser.id) {
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

  // 4. Gruppendetails aus der Datenbank abrufen
  try {
    const group = await prisma.group.findUnique({
      where: {
        id: groupId,
      },
      // Kein explizites 'select' ist hier nötig, um alle Skalarfelder
      // (id, name, description, inviteToken, createdById, createdAt, updatedAt)
      // zu bekommen. Prisma holt sie standardmäßig.
      // Falls du Relationen brauchst (z.B. members), müsstest du 'include' verwenden.
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Stelle sicher, dass das zurückgegebene Objekt dem clientseitigen Typ 'Group' entspricht.
    // Prisma gibt Felder in camelCase zurück (z.B. inviteToken, createdById).
    // Dein Client-Typ Group = PrismaGroup sollte das direkt matchen.
    return NextResponse.json(group); // Gibt das einzelne Gruppenobjekt zurück
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
