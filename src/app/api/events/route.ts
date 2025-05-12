// src/app/api/events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
// Passe die Pfade an deine Struktur an
import { prisma } from '../lib/prisma';
import { getCurrentUserFromRequest, AuthenticatedUser } from '../lib/auth';
import { isUserMemberOfGroup } from '../services/groupService'; // Importieren!
// Optional: Event Service importieren, falls Logik ausgelagert wird
// import * as eventService from '../services/eventService';
// Typ EventCreate wird ggf. nicht mehr benötigt, da Zod den Typ ableitet
// import type { EventCreate } from '../../lib/types';

// --- Zod Schema für die Validierung (ANGEPASST für Tipping Deadline) ---
const eventCreateSchema = z.object({
  title: z.string().min(1, 'Titel erforderlich').max(255),
  description: z.string().max(1000).nullable().optional(),
  group_id: z.number().int().positive('Gültige Gruppen-ID erforderlich'),
  question: z.string().min(1, 'Frage erforderlich').max(255),
  options: z
    .array(z.string().min(1))
    .min(2, 'Mindestens 2 Optionen erforderlich'),
  // NEU: Tipping Deadline als optionaler ISO 8601 String
  tippingDeadline: z
    .string()
    .datetime({
      offset: true, // Erfordert Zeitzoneninformation (Z oder +/-HH:MM)
      message:
        'Muss ein gültiger ISO 8601 Datumsstring sein (z.B. 2025-05-13T10:00:00Z oder 2025-05-13T12:00:00+02:00)',
    })
    .optional() // Macht das Feld optional
    .nullable() // Erlaubt explizit null
    .refine(
      (val) => !val || new Date(val) > new Date(), // Nur prüfen wenn Wert gesetzt ist
      {
        message: 'Tipp-Deadline muss in der Zukunft liegen.',
      }
    )
    .transform((val) => (val ? new Date(val) : null)), // In Date-Objekt oder null umwandeln
  // event_datetime: z.string().datetime().optional(), // Altes Feld (auskommentiert im Original)
});

// Abgeleiteter Typ aus dem Zod Schema
type ValidatedEventCreateData = z.infer<typeof eventCreateSchema>;

export async function POST(req: NextRequest) {
  const routeName = '/api/events';
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

  // 2. Request Body lesen und validieren (angepasst für Zod)
  let parsedData: ValidatedEventCreateData; // Verwende den abgeleiteten Typ
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
    // Zod stellt sicher, dass parsed.data dem Typ ValidatedEventCreateData entspricht
    parsedData = parsed.data;
    console.log(`[ROUTE ${routeName}] Payload validated successfully.`);
  } catch (parseError) {
    console.error(`[ROUTE ${routeName}] Error parsing JSON body:`, parseError);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  // --- 3. AUTORISIERUNG: Prüfen, ob User Mitglied der Gruppe ist ---
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
        { error: 'Only members of the group can add events.' },
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

  // 4. Event in der Datenbank erstellen (angepasst für Tipping Deadline)
  try {
    console.log(`[ROUTE ${routeName}] Attempting to create event in DB.`);
    const newEvent = await prisma.event.create({
      data: {
        title: parsedData.title,
        description: parsedData.description,
        question: parsedData.question,
        options: parsedData.options, // Prisma speichert dies als JSON
        groupId: parsedData.group_id,
        createdById: currentUser.id,
        // NEU: Füge die validierte und transformierte Deadline hinzu (ist Date | null)
        tippingDeadline: parsedData.tippingDeadline,
      },
    });
    console.log(
      `[ROUTE ${routeName}] Event created successfully with ID: ${newEvent.id}.`
    );
    // Prisma gibt standardmäßig alle Felder zurück, inklusive der neuen tippingDeadline
    return NextResponse.json(newEvent, { status: 201 });
  } catch (dbError) {
    console.error(
      `[ROUTE ${routeName}] Database error during event creation:`,
      dbError
    );
    // Hier könnten spezifischere Fehlerprüfungen sinnvoll sein (z.B. unique constraints)
    return NextResponse.json(
      { error: 'Could not create event.' },
      { status: 500 }
    );
  }
}

// Optional: GET Handler, falls benötigt (wird von diesem Pfad normalerweise nicht erwartet,
// da GET für Listen und POST für Erstellung ist. GET für spezifische Events wäre /api/events/[eventId])
// export async function GET(req: NextRequest) { ... }
