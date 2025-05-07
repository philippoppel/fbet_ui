// src/app/api/events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
// Passe die Pfade an deine Struktur an
import { prisma } from '../lib/prisma';
import { getCurrentUserFromRequest, AuthenticatedUser } from '../lib/auth';
import { isUserMemberOfGroup } from '../services/groupService'; // Importieren!
// Optional: Event Service importieren, falls Logik ausgelagert wird
// import * as eventService from '../services/eventService';
import type { EventCreate } from '../../lib/types';

// --- Zod Schema für die Validierung (unverändert) ---
const eventCreateSchema = z.object({
  title: z.string().min(1, 'Titel erforderlich').max(255),
  description: z.string().max(1000).nullable().optional(),
  group_id: z.number().int().positive('Gültige Gruppen-ID erforderlich'),
  question: z.string().min(1, 'Frage erforderlich').max(255),
  options: z
    .array(z.string().min(1))
    .min(2, 'Mindestens 2 Optionen erforderlich'),
  // event_datetime: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  const routeName = '/api/events';
  console.log(`[ROUTE ${routeName}] POST request received.`);

  // 1. Authentifizierung (unverändert)
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

  // 2. Request Body lesen und validieren (unverändert)
  let parsedData: EventCreate;
  try {
    const json = await req.json();
    console.log(
      `[ROUTE ${routeName}] Received payload:`,
      JSON.stringify(json, null, 2)
    );
    const parsed = eventCreateSchema.safeParse(json);

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
    parsedData = parsed.data as EventCreate;
    console.log(`[ROUTE ${routeName}] Payload validated successfully.`);
  } catch (parseError) {
    console.error(`[ROUTE ${routeName}] Error parsing JSON body:`, parseError);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  // --- 3. AUTORISIERUNG GEÄNDERT: Prüfen, ob User Mitglied der Gruppe ist ---
  try {
    // Stelle sicher, dass die Gruppe überhaupt existiert (optional, aber gut)
    const groupExists = await prisma.group.findUnique({
      where: { id: parsedData.group_id },
      select: { id: true }, // Nur prüfen, ob es sie gibt
    });
    if (!groupExists) {
      console.log(
        `[ROUTE ${routeName}] Group not found: ${parsedData.group_id}. Returning 404.`
      );
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Prüfe die Mitgliedschaft
    const isMember = await isUserMemberOfGroup(
      currentUser.id,
      parsedData.group_id
    );

    if (!isMember) {
      console.log(
        `[ROUTE ${routeName}] Forbidden: User ${currentUser.id} is not member of group ${parsedData.group_id}. Returning 403.`
      );
      return NextResponse.json(
        { error: 'Only members of the group can add events.' }, // Nachricht angepasst
        { status: 403 }
      );
    }
    console.log(
      `[ROUTE ${routeName}] Authorization successful (is member) for user ${currentUser.id} in group ${parsedData.group_id}.`
    );
  } catch (authzError) {
    console.error(
      `[ROUTE ${routeName}] Authorization check error:`,
      authzError
    );
    return NextResponse.json(
      { error: 'Authorization check failed' },
      { status: 500 }
    );
  }
  // ---------------------------------------------------------------------

  // 4. Event in der Datenbank erstellen (unverändert)
  try {
    console.log(`[ROUTE ${routeName}] Attempting to create event in DB.`);
    const newEvent = await prisma.event.create({
      data: {
        title: parsedData.title,
        description: parsedData.description,
        question: parsedData.question,
        options: parsedData.options,
        groupId: parsedData.group_id,
        createdById: currentUser.id,
      },
    });
    console.log(
      `[ROUTE ${routeName}] Event created successfully with ID: ${newEvent.id}.`
    );
    return NextResponse.json(newEvent, { status: 201 });
  } catch (dbError) {
    console.error(
      `[ROUTE ${routeName}] Database error during event creation:`,
      dbError
    );
    return NextResponse.json(
      { error: 'Could not create event.' },
      { status: 500 }
    );
  }
}

// Optional: GET Handler, falls vorhanden, bleibt unverändert
// export async function GET(req: NextRequest) { ... }
