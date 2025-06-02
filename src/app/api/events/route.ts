// src/app/api/events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
// Importiere prisma nur, wenn es für andere Checks hier noch direkt benötigt wird
// import { prisma } from '../lib/prisma';
import { getCurrentUserFromRequest, AuthenticatedUser } from '../lib/auth';
import { isUserMemberOfGroup } from '../services/groupService'; // Annahme: Dieser Service existiert
import { createEvent as createEventFromService } from '../services/eventService'; // WICHTIG: Importiere createEvent aus dem Service
import type { EventCreate as AppEventCreate } from '@/app/lib/types'; // Importiere deinen Typ

// --- Zod Schema für die Validierung (bleibt gleich) ---
const eventCreateSchema = z.object({
  title: z.string().min(1, 'Titel erforderlich').max(255),
  description: z.string().max(1000).nullable().optional(),
  group_id: z.number().int().positive('Gültige Gruppen-ID erforderlich'),
  question: z.string().min(1, 'Frage erforderlich').max(255),
  options: z
    .array(z.string().min(1).max(255)) // Max Länge für Optionen hinzugefügt (optional)
    .min(2, 'Mindestens 2 Optionen erforderlich'),
  tippingDeadline: z // Dein bestehendes tippingDeadline Schema
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message:
        'Ungültige Deadline: Muss ein gültiges ISO-Datum sein oder leer sein.',
    })
    .optional()
    .nullable()
    .transform((val) => (val ? new Date(val) : null)) // Wird zu Date oder null
    .refine((val) => !val || val > new Date(), {
      // Prüfung nur wenn val ein Datum ist
      message: 'Tipp-Deadline muss in der Zukunft liegen.',
    }),
  // Falls event_datetime Teil deines Frontends ist, hier auch validieren:
  // event_datetime: z.string().refine(...).optional().nullable().transform(...)
});

export async function POST(req: NextRequest) {
  const routeName = '/api/events (POST)'; // Präzisiert für Logging
  console.log(`[ROUTE ${routeName}] Request received.`);

  let currentUser: AuthenticatedUser | null;
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
    console.error(`[ROUTE ${routeName}] Error during auth:`, authCatchError);
    return NextResponse.json(
      { error: 'Authentication service error' },
      { status: 500 }
    );
  }

  let parsedZodData: z.infer<typeof eventCreateSchema>;
  try {
    const json = await req.json();
    console.log(
      `[ROUTE ${routeName}] Received payload:`,
      JSON.stringify(json, null, 2)
    );
    const parsedResult = eventCreateSchema.safeParse(json);

    if (!parsedResult.success) {
      console.error(
        `[ROUTE ${routeName}] Zod validation failed:`,
        parsedResult.error.flatten()
      );
      return NextResponse.json(
        { error: 'Invalid input', details: parsedResult.error.flatten() },
        { status: 400 }
      );
    }
    parsedZodData = parsedResult.data;
    console.log(`[ROUTE ${routeName}] Payload validated successfully.`);
  } catch (parseError) {
    console.error(`[ROUTE ${routeName}] Error parsing JSON body:`, parseError);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  try {
    // Prisma direkt importieren, wenn hier benötigt für groupExists Check
    const { prisma } = await import('../lib/prisma.js'); // .js hinzugefügt
    const groupExists = await prisma.group.findUnique({
      where: { id: parsedZodData.group_id },
      select: { id: true },
    });
    if (!groupExists) {
      console.log(
        `[ROUTE ${routeName}] Group not found: ${parsedZodData.group_id}.`
      );
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const isMember = await isUserMemberOfGroup(
      currentUser.id,
      parsedZodData.group_id
    );
    if (!isMember) {
      console.log(
        `[ROUTE ${routeName}] Forbidden: User ${currentUser.id} is not member of group ${parsedZodData.group_id}.`
      );
      return NextResponse.json(
        { error: 'Only members of the group can add events.' },
        { status: 403 }
      );
    }
    console.log(
      `[ROUTE ${routeName}] Authorization successful (user is member).`
    );
  } catch (authzError) {
    console.error(
      `[ROUTE ${routeName}] Authorization check error (group membership):`,
      authzError
    );
    return NextResponse.json(
      { error: 'Authorization check failed' },
      { status: 500 }
    );
  }

  try {
    console.log(
      `[ROUTE ${routeName}] Calling event service to create event with data:`,
      parsedZodData
    );

    // Aufbereitung der Daten für den eventService
    // Stelle sicher, dass dies dem Typ `AppEventCreate` entspricht, den dein Service erwartet.
    // In src/app/api/events/route.ts
    const eventDataForService: AppEventCreate = {
      title: parsedZodData.title,
      description:
        parsedZodData.description === null
          ? undefined
          : parsedZodData.description,
      question: parsedZodData.question,
      options: parsedZodData.options,
      group_id: parsedZodData.group_id,
      tippingDeadline: parsedZodData.tippingDeadline // Ist Date | null
        ? parsedZodData.tippingDeadline.toISOString() // Konvertiere Date zu ISO String
        : undefined, // Konvertiere null zu undefined
      // event_datetime: parsedZodData.event_datetime ? parsedZodData.event_datetime.toISOString() : undefined, // Falls event_datetime auch ein Date-Objekt ist
    };

    const newEvent = await createEventFromService(
      eventDataForService,
      currentUser.id
    );

    console.log(
      `[ROUTE ${routeName}] Event created successfully by service. Event ID: ${newEvent.id}.`
    );
    return NextResponse.json(newEvent, { status: 201 });
  } catch (serviceOrDbError) {
    console.error(
      `[ROUTE ${routeName}] Error calling event service or during DB operation:`,
      serviceOrDbError
    );
    // Spezifischere Fehlermeldung, falls der Service einen bekannten Fehler wirft
    if (
      serviceOrDbError instanceof Error &&
      serviceOrDbError.message.includes('Group not found')
    ) {
      return NextResponse.json(
        { error: 'Group not found within service.' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Could not create event due to a server error.' },
      { status: 500 }
    );
  }
}
