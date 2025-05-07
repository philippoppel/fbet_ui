// src/app/api/groups/[groupId]/members/route.ts
import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@prisma/client'; // Prisma User-Typ
import type { UserOut } from '@/app/lib/types';
import { getCurrentUserFromRequest } from '@/app/api/lib/auth'; // Dein UserOut-Typ (aus src/app/lib/types.ts)
import * as groupService from '../../../services/groupService'; // Korrigierter Pfad

interface RouteContext {
  params: {
    groupId?: string;
  };
}

// Hilfsfunktion zum Mappen von Prisma User zu UserOut
// Stelle sicher, dass UserOut in src/app/lib/types.ts so definiert ist,
// dass es die Felder id, email und name enthält.
function mapUserToUserOut(user: User): UserOut {
  const { hashedPassword, ...userOutData } = user; // Entfernt hashedPassword und behält den Rest
  return userOutData;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupIdString = context.params.groupId;
    if (!groupIdString) {
      return NextResponse.json(
        { error: 'Group ID is missing in path' },
        { status: 400 }
      );
    }
    const groupId = parseInt(groupIdString, 10);
    if (isNaN(groupId)) {
      return NextResponse.json(
        { error: 'Invalid Group ID format' },
        { status: 400 }
      );
    }

    // Optional: Prüfen, ob die Gruppe überhaupt existiert
    const groupExists = await groupService.getGroupById(groupId);
    if (!groupExists) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Berechtigungsprüfung: Ist der aktuelle Benutzer Mitglied der Gruppe?
    // Du könntest hier auch erlauben, dass der Gruppenersteller (groupExists.createdById === currentUser.id)
    // immer Zugriff hat, auch wenn er kein explizites Mitglied (mehr) ist.
    const isMember = await groupService.isUserMemberOfGroup(
      currentUser.id,
      groupId
    );
    if (!isMember) {
      return NextResponse.json(
        { error: "Access to this group's members is not allowed." },
        { status: 403 } // Forbidden
      );
    }

    // Mitglieder aus dem Service abrufen
    const members = await groupService.getMembersOfGroup(groupId);

    // Prisma User-Objekte in UserOut-Objekte umwandeln, um sensible Daten zu entfernen
    const membersOut: UserOut[] = members.map(mapUserToUserOut);

    return NextResponse.json(membersOut, { status: 200 });
  } catch (error) {
    console.error(`Error in GET /api/groups/[groupId]/members:`, error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json(
      { error: 'Could not retrieve group members.', details: errorMessage },
      { status: 500 }
    );
  }
}
