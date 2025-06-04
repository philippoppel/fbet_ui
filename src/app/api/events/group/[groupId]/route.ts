// src/app/api/events/group/[groupId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
// Passe die Pfade an deine Struktur an
import { prisma } from '../../../lib/prisma'; // Wird für Auth-Checks noch gebraucht
import { verifyJwt } from '../../../lib/jwt'; // Für die Authentifizierung
import { getEventsForGroup } from '../../../services/eventService'; // <<--- WICHTIGER IMPORT
import { isUserMemberOfGroup } from '../../../services/groupService'; // Für die Autorisierung

interface UserPayload {
  sub: string;
  // ... andere Felder im JWT Payload
}

export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  const { groupId: groupIdString } = params;
  const routeName = `/api/events/group/${groupIdString}`; // Für Logging
  console.log(`[ROUTE ${routeName}] GET request received.`);

  const groupId = parseInt(groupIdString, 10);

  // --- 1. Validierung der groupId ---
  if (isNaN(groupId) || groupId <= 0) {
    console.log(
      `[ROUTE ${routeName}] Invalid groupId: "${groupIdString}". Returning 400.`
    );
    return NextResponse.json(
      { error: 'Invalid group ID format' },
      { status: 400 }
    );
  }
  console.log(`[ROUTE ${routeName}] Validated groupId: ${groupId}.`);

  // --- 2. Authentifizierung: Aktuellen Benutzer ermitteln ---
  let currentUserId: number;
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log(
        `[ROUTE ${routeName}] Auth failed: No Bearer token. Returning 401.`
      );
      return NextResponse.json(
        { error: 'Authorization header missing or invalid' },
        { status: 401 }
      );
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
      console.log(
        `[ROUTE ${routeName}] Auth failed: Token missing. Returning 401.`
      );
      return NextResponse.json({ error: 'Token missing' }, { status: 401 });
    }

    const decodedToken = verifyJwt(token) as UserPayload | null;
    if (!decodedToken?.sub) {
      console.log(
        `[ROUTE ${routeName}] Auth failed: Invalid token payload. Returning 401.`
      );
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    currentUserId = parseInt(decodedToken.sub, 10);
    if (isNaN(currentUserId)) {
      console.log(
        `[ROUTE ${routeName}] Auth failed: Invalid user ID in token. Returning 401.`
      );
      return NextResponse.json(
        { error: 'Invalid user ID in token' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: currentUserId } });
    if (!user?.isActive) {
      console.log(
        `[ROUTE ${routeName}] Auth failed: User ${currentUserId} not found or inactive. Returning 401.`
      );
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 401 }
      );
    }
    console.log(`[ROUTE ${routeName}] Auth success: User ID ${currentUserId}.`);
  } catch (error) {
    console.error(`[ROUTE ${routeName}] Authentication error:`, error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }

  // --- 3. Autorisierung: Prüfen, ob der Benutzer Mitglied der Gruppe ist ---
  try {
    console.log(
      `[ROUTE ${routeName}] Checking membership for user ${currentUserId}, group ${groupId}.`
    );
    const isMember = await isUserMemberOfGroup(currentUserId, groupId);

    if (!isMember) {
      // Optionale Zusatzprüfung: Ist der User der Ersteller der Gruppe?
      const groupData = await prisma.group.findUnique({
        where: { id: groupId },
        select: { createdById: true },
      });

      if (groupData?.createdById !== currentUserId) {
        console.log(
          `[ROUTE ${routeName}] Forbidden: User ${currentUserId} not member or creator of group ${groupId}. Returning 403.`
        );
        return NextResponse.json(
          {
            error:
              'Forbidden: User is not a member of this group nor its creator.',
          },
          { status: 403 }
        );
      }
    }
    console.log(
      `[ROUTE ${routeName}] Authorization success for user ${currentUserId}, group ${groupId}.`
    );
  } catch (error) {
    console.error(
      `[ROUTE ${routeName}] Authorization check error for group ${groupId} and user ${currentUserId}:`,
      error
    );
    return NextResponse.json(
      { error: 'Internal server error during authorization check.' },
      { status: 500 }
    );
  }

  // --- 4. Datenabfrage: Events für die Gruppe holen MIT awardedPoints ---
  try {
    console.log(
      `[ROUTE ${routeName}] Calling eventService.getEventsForGroup for groupId: ${groupId}.`
    );
    // Rufe die Service-Funktion auf, die 'awardedPoints' enthält
    const eventsWithPoints = await getEventsForGroup(groupId);

    // DEBUG LOG: Was wird an den Client gesendet?
    console.log(
      `[ROUTE ${routeName}] Returning events to client:`,
      JSON.stringify(
        eventsWithPoints.map((e) => ({
          id: e.id,
          title: e.title,
          awardedPointsCount: e.awardedPoints?.length ?? 0,
        })),
        null,
        2
      )
    );

    return NextResponse.json(eventsWithPoints); // Gibt die angereicherten Events zurück
  } catch (error) {
    console.error(
      `[ROUTE ${routeName}] Error fetching events for group ${groupId}:`,
      error
    );
    return NextResponse.json(
      { error: 'Internal server error while fetching events.' },
      { status: 500 }
    );
  }
}
