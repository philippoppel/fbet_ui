// src/app/api/tips/highscore/[groupId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
// Stelle sicher, dass die Pfade zu deinen Bibliotheken korrekt sind
import {
  getCurrentUserFromRequest,
  AuthenticatedUser,
} from '../../../lib/auth'; // Pfad anpassen
import { isUserMemberOfGroup } from '../../../services/groupService'; // Pfad anpassen
import { getHighscoreForGroup } from '../../../services/highscoreService'; // Pfad anpassen

export async function GET(
  req: NextRequest,
  { params }: { params: { groupId: string } }
) {
  const routeName = `/api/tips/highscore/${params.groupId}`;
  console.log(`[ROUTE ${routeName}] Handler started.`);

  // 1. Authentifizierung
  let user: AuthenticatedUser | null = null;
  try {
    user = await getCurrentUserFromRequest(req);
    if (!user) {
      console.log(`[ROUTE ${routeName}] Auth failed: No user. Returning 401.`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log(`[ROUTE ${routeName}] Auth success: User ID ${user.id}.`);
  } catch (authCatchError) {
    console.error(
      `[ROUTE ${routeName}] CRITICAL: Error during getCurrentUserFromRequest call:`,
      authCatchError
    );
    return NextResponse.json(
      { error: 'Authentication service error' },
      { status: 500 }
    );
  }

  // 2. Parameter Validierung
  const groupIdNum = Number(params.groupId);
  if (isNaN(groupIdNum) || groupIdNum <= 0) {
    console.log(
      `[ROUTE ${routeName}] Invalid groupId: "${params.groupId}". Returning 400.`
    );
    return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
  }
  console.log(`[ROUTE ${routeName}] Validated groupId: ${groupIdNum}.`);

  // 3. Autorisierung: Ist der User Mitglied der Gruppe?
  try {
    console.log(
      `[ROUTE ${routeName}] Checking membership for user ${user.id}, group ${groupIdNum}.`
    );
    const isMember = await isUserMemberOfGroup(user.id, groupIdNum); // User ist hier sicher nicht null
    if (!isMember) {
      console.log(
        `[ROUTE ${routeName}] Forbidden: User ${user.id} not member of group ${groupIdNum}. Returning 403.`
      );
      // Optional: Prüfen, ob der User der Ersteller der Gruppe ist
      // const groupOwnerCheck = await prisma.group.findUnique({ where: { id: groupIdNum }, select: { createdById: true } });
      // if (groupOwnerCheck?.createdById !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      // }
    }
    console.log(
      `[ROUTE ${routeName}] Authorization success for user ${user.id}, group ${groupIdNum}.`
    );
  } catch (authError) {
    console.error(
      `[ROUTE ${routeName}] Authorization check block error:`,
      authError
    );
    return NextResponse.json(
      { error: 'Error during authorization' },
      { status: 500 }
    );
  }

  // 4. Highscore abrufen
  try {
    console.log(
      `[ROUTE ${routeName}] Attempting to get highscore for group ${groupIdNum}.`
    );
    const highscore = await getHighscoreForGroup(groupIdNum); // Ruft den Service auf, der jetzt immer Promise<HighscoreEntry[]> zurückgibt
    console.log(
      `[ROUTE ${routeName}] Highscore data received from service: ${JSON.stringify(highscore)}`
    );

    if (highscore === undefined) {
      // Dieser Fall sollte dank der Service-Änderung nicht mehr eintreten
      console.error(
        `[ROUTE ${routeName}] CRITICAL: getHighscoreForGroup returned undefined!`
      );
      return NextResponse.json(
        {
          error:
            'Failed to process highscore data (service returned undefined)',
        },
        { status: 500 }
      );
    }

    console.log(
      `[ROUTE ${routeName}] Attempting to return NextResponse.json with highscore.`
    );
    const response = NextResponse.json(highscore); // highscore ist jetzt garantiert ein Array (ggf. leer)
    console.log(
      `[ROUTE ${routeName}] NextResponse.json(highscore) created. Now returning this response.`
    );
    return response;
  } catch (e) {
    console.error(
      `[ROUTE ${routeName}] Error in highscore retrieval/response block:`,
      e
    );
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Server error while reading highscore', details: errorMessage },
      { status: 500 }
    );
  }

  // Safety Net - Dieser Code sollte nie erreicht werden.
  console.error(
    `[ROUTE ${routeName}] CRITICAL FALLBACK: Route handler reached very end without returning a response! This indicates a logic flaw.`
  );
  return NextResponse.json(
    { error: 'Handler fallthrough - unhandled execution path' },
    { status: 500 }
  );
}
