// src/app/api/tips/route.ts
import { NextRequest, NextResponse } from 'next/server';
// Passe Pfade an
import { prisma } from '../lib/prisma';
import { getCurrentUserFromRequest, AuthenticatedUser } from '../lib/auth';
import { tipCreateSchema } from '../lib/tipSchema'; // Importiere das neue Schema
import type { Tip } from '@prisma/client'; // Importiere den Prisma Typ für die Rückgabe

export async function POST(req: NextRequest) {
  const routeName = '/api/tips';
  console.log(`[ROUTE ${routeName}] POST request received.`);

  // 1. Authentifizierung
  let currentUser: AuthenticatedUser | null = null;
  try {
    currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      console.log(`[ROUTE ${routeName}] Auth failed: No user. Returning 401.`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log(
      `[ROUTE ${routeName}] Auth success: User ID ${currentUser.id}.`
    );
  } catch (authCatchError) {
    console.error(
      `[ROUTE ${routeName}] CRITICAL: Error during auth:`,
      authCatchError
    );
    return NextResponse.json(
      { error: 'Authentication service error' },
      { status: 500 }
    );
  }

  // 2. Request Body lesen und validieren
  let parsedData: { event_id: number; selected_option: string };
  try {
    const json = await req.json();
    console.log(
      `[ROUTE ${routeName}] Received payload:`,
      JSON.stringify(json, null, 2)
    );
    // Verwende das tipCreateSchema für die Validierung
    const parsed = tipCreateSchema.safeParse(json);

    if (!parsed.success) {
      console.error(
        `[ROUTE ${routeName}] Zod validation failed:`,
        parsed.error.flatten()
      );
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    parsedData = parsed.data;
    console.log(`[ROUTE ${routeName}] Payload validated successfully.`);
  } catch (parseError) {
    console.error(`[ROUTE ${routeName}] Error parsing JSON body:`, parseError);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  // 3. Zusätzliche Logik (optional, aber empfohlen)
  try {
    // Prüfen, ob das Event existiert und offen ist
    const event = await prisma.event.findUnique({
      where: { id: parsedData.event_id },
      select: { winningOption: true, options: true, groupId: true }, // Holen, was wir brauchen
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (event.winningOption !== null) {
      return NextResponse.json(
        { error: 'Event is already closed for tipping' },
        { status: 400 }
      );
    }
    // Prüfen, ob die gewählte Option gültig ist
    if (
      !Array.isArray(event.options) ||
      !event.options.includes(parsedData.selected_option as any)
    ) {
      // Prisma speichert JSON als 'any', daher die Typumwandlung oder spezifischere Prüfung
      return NextResponse.json(
        { error: 'Invalid option selected for this event' },
        { status: 400 }
      );
    }

    // Prüfen, ob der User Mitglied der Gruppe ist, zu der das Event gehört
    const isMember = await prisma.groupMembership.findUnique({
      where: {
        uq_user_group: { userId: currentUser.id, groupId: event.groupId },
      },
    });
    if (!isMember) {
      return NextResponse.json(
        { error: 'User is not a member of the group for this event' },
        { status: 403 }
      );
    }
  } catch (validationError) {
    console.error(
      `[ROUTE ${routeName}] Error during event/membership validation:`,
      validationError
    );
    return NextResponse.json(
      { error: 'Failed to validate event or membership' },
      { status: 500 }
    );
  }

  // 4. Tipp in der Datenbank erstellen ODER aktualisieren (Upsert)
  try {
    console.log(
      `[ROUTE ${routeName}] Attempting to upsert tip for user ${currentUser.id}, event ${parsedData.event_id}.`
    );
    const upsertedTip = await prisma.tip.upsert({
      where: {
        // Der unique constraint aus deinem Prisma Schema
        unique_tip_per_user_per_event: {
          userId: currentUser.id,
          eventId: parsedData.event_id,
        },
      },
      update: {
        // Das wird ausgeführt, wenn schon ein Tipp existiert
        selectedOption: parsedData.selected_option,
      },
      create: {
        // Das wird ausgeführt, wenn noch kein Tipp existiert
        userId: currentUser.id,
        eventId: parsedData.event_id,
        selectedOption: parsedData.selected_option,
        // points wird hier nicht gesetzt, das passiert später, wenn das Ergebnis feststeht
      },
    });
    console.log(
      `[ROUTE ${routeName}] Tip upserted successfully with ID: ${upsertedTip.id}.`
    );
    return NextResponse.json(upsertedTip, { status: 200 }); // OK (oder 201 bei Create, aber 200 ist für Upsert ok)
  } catch (dbError) {
    console.error(
      `[ROUTE ${routeName}] Database error during tip upsert:`,
      dbError
    );
    return NextResponse.json({ error: 'Could not save tip.' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const routeName = '/api/tips (GET)';
  console.log(`[ROUTE ${routeName}] GET request received.`);

  // 1. Authentifizierung
  const currentUser = await getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Optional: groupId aus Query-Parametern holen, um Tipps zu filtern
  const { searchParams } = new URL(req.url);
  const groupIdParam = searchParams.get('groupId');
  const groupId = groupIdParam ? parseInt(groupIdParam, 10) : null;

  if (groupId === null || isNaN(groupId)) {
    // Hier entscheiden: Alle Tipps des Users zurückgeben oder Fehler?
    // Fürs Erste: Fehler, wenn keine groupId angegeben ist.
    return NextResponse.json(
      { error: 'Missing or invalid groupId query parameter' },
      { status: 400 }
    );
  }

  // 3. Tipps des Users für die Events der gegebenen Gruppe holen
  try {
    const userTips = await prisma.tip.findMany({
      where: {
        userId: currentUser.id,
        event: {
          // Filtern nach Events in der Gruppe
          groupId: groupId,
        },
      },
      select: {
        // Nur relevante Felder auswählen
        eventId: true,
        selectedOption: true,
        id: true, // Optional: Tipp-ID
      },
    });
    console.log(
      `[ROUTE ${routeName}] Found ${userTips.length} tips for user ${currentUser.id} in group ${groupId}.`
    );
    return NextResponse.json(userTips);
  } catch (dbError) {
    console.error(
      `[ROUTE ${routeName}] Error fetching user tips for group ${groupId}:`,
      dbError
    );
    return NextResponse.json(
      { error: 'Could not fetch user tips.' },
      { status: 500 }
    );
  }
}

// Optional: GET Handler für Tipps hinzufügen (siehe nächsten Schritt)
// export async function GET(req: NextRequest) { ... }
