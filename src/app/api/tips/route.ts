// src/app/api/tips/route.ts
import { NextRequest, NextResponse } from 'next/server';
// Passe Pfade an deine Struktur an
import { prisma } from '../lib/prisma';
import { getCurrentUserFromRequest, AuthenticatedUser } from '../lib/auth';
import { tipCreateSchema } from '../lib/tipSchema'; // Schema für Tip-Erstellung
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

  // 3. Zusätzliche Logik und Deadline-Prüfung
  try {
    // Prüfen, ob das Event existiert und relevante Daten holen (inkl. Deadline)
    const event = await prisma.event.findUnique({
      where: { id: parsedData.event_id },
      select: {
        id: true,
        winningOption: true,
        options: true,
        groupId: true,
        tippingDeadline: true, // <-- WICHTIG: Deadline holen
      },
    });

    if (!event) {
      console.log(
        `[ROUTE ${routeName}] Event not found: ${parsedData.event_id}. Returning 404.`
      );
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Prüfen, ob das Event bereits entschieden ist
    if (event.winningOption !== null) {
      console.log(
        `[ROUTE ${routeName}] Event ${event.id} already has a winning option. Returning 400.`
      );
      return NextResponse.json(
        { error: 'Event is already closed' },
        { status: 400 }
      );
    }

    // *** NEUE PRÜFUNG: Deadline ***
    const now = new Date();
    // event.tippingDeadline kommt als Date | null aus Prisma
    if (event.tippingDeadline && now > event.tippingDeadline) {
      console.log(
        `[ROUTE ${routeName}] Tipping rejected for event ${
          event.id
        }: Deadline passed (${event.tippingDeadline.toISOString()})`
      );
      return NextResponse.json(
        { error: 'Tipping deadline has passed for this event.' },
        { status: 400 } // 400 Bad Request ist hier passend
      );
    }
    console.log(
      `[ROUTE ${routeName}] Tipping deadline check passed for event ${event.id}.`
    );

    // Prüfen, ob die gewählte Option gültig ist
    // Prisma speichert JSON als 'any' oder spezifischeren Typ, je nach DB/Version. Sicherstellen, dass der Check passt.
    if (
      !Array.isArray(event.options) ||
      !(event.options as string[]).includes(parsedData.selected_option)
    ) {
      console.log(
        `[ROUTE ${routeName}] Invalid option "${parsedData.selected_option}" for event ${event.id}. Returning 400.`
      );
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
      select: { id: true }, // Nur prüfen, ob es existiert
    });
    if (!isMember) {
      console.log(
        `[ROUTE ${routeName}] User ${currentUser.id} not member of group ${event.groupId} for event ${event.id}. Returning 403.`
      );
      return NextResponse.json(
        { error: 'User is not a member of the group for this event' },
        { status: 403 }
      );
    }
    console.log(
      `[ROUTE ${routeName}] User ${currentUser.id} is member of group ${event.groupId}. Proceeding.`
    );
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
  // Die Deadline wurde oben bereits geprüft.
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
        updatedAt: new Date(), // Explizit das Update-Datum setzen
      },
      create: {
        // Das wird ausgeführt, wenn noch kein Tipp existiert
        userId: currentUser.id,
        eventId: parsedData.event_id,
        selectedOption: parsedData.selected_option,
        // points wird hier nicht gesetzt, das passiert später
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
    // Hier könnten spezifischere Fehlerprüfungen sinnvoll sein (z.B. Foreign Key Constraints)
    return NextResponse.json({ error: 'Could not save tip.' }, { status: 500 });
  }
}

// GET Handler zum Abrufen von Tipps (unverändert bezüglich Deadline-Logik)
export async function GET(req: NextRequest) {
  const routeName = '/api/tips (GET)';
  console.log(`[ROUTE ${routeName}] GET request received.`);

  // 1. Authentifizierung
  const currentUser = await getCurrentUserFromRequest(req);
  if (!currentUser) {
    console.log(`[ROUTE ${routeName}] Auth failed. Returning 401.`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  console.log(`[ROUTE ${routeName}] Auth success for user ${currentUser.id}.`);

  // 2. Optional: groupId aus Query-Parametern holen
  const { searchParams } = new URL(req.url);
  const groupIdParam = searchParams.get('groupId');
  const groupId = groupIdParam ? parseInt(groupIdParam, 10) : null;

  if (groupId === null || isNaN(groupId)) {
    // Entscheidung: Fehler wenn keine groupId? Ja, laut Originalcode.
    console.log(
      `[ROUTE ${routeName}] Missing or invalid groupId param. Returning 400.`
    );
    return NextResponse.json(
      { error: 'Missing or invalid groupId query parameter' },
      { status: 400 }
    );
  }
  console.log(
    `[ROUTE ${routeName}] Filtering tips for user ${currentUser.id} and group ${groupId}.`
  );

  // 3. Tipps des Users für die Events der gegebenen Gruppe holen
  try {
    const userTips = await prisma.tip.findMany({
      where: {
        userId: currentUser.id,
        event: {
          // Filtern nach Events in der spezifischen Gruppe
          groupId: groupId,
        },
      },
      select: {
        // Nur relevante Felder auswählen für die Antwort
        eventId: true,
        selectedOption: true,
        id: true, // Tipp-ID
        // Hier werden KEINE Event-Details wie TippingDeadline benötigt
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
