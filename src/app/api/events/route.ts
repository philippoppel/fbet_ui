// src/app/api/events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { getCurrentUserFromRequest, AuthenticatedUser } from '../lib/auth';
import { isUserMemberOfGroup } from '../services/groupService';

// --- Zod Schema für die Validierung (robust gegen fehlende Zeitzone) ---
const eventCreateSchema = z.object({
  title: z.string().min(1, 'Titel erforderlich').max(255),
  description: z.string().max(1000).nullable().optional(),
  group_id: z.number().int().positive('Gültige Gruppen-ID erforderlich'),
  question: z.string().min(1, 'Frage erforderlich').max(255),
  options: z
    .array(z.string().min(1))
    .min(2, 'Mindestens 2 Optionen erforderlich'),
  tippingDeadline: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Ungültige Deadline: Muss ein gültiges ISO-Datum sein.',
    })
    .optional()
    .nullable()
    .transform((val) => (val ? new Date(val) : null))
    .refine((val) => !val || val > new Date(), {
      message: 'Tipp-Deadline muss in der Zukunft liegen.',
    }),
});

type ValidatedEventCreateData = z.infer<typeof eventCreateSchema>;

export async function POST(req: NextRequest) {
  const routeName = '/api/events';
  console.log(`[ROUTE ${routeName}] POST request received.`);

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
    console.error(`[ROUTE ${routeName}] Error during auth:`, authCatchError);
    return NextResponse.json(
      { error: 'Authentication service error' },
      { status: 500 }
    );
  }

  let parsedData: ValidatedEventCreateData;
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
    parsedData = parsed.data;
    console.log(`[ROUTE ${routeName}] Payload validated successfully.`);
  } catch (parseError) {
    console.error(`[ROUTE ${routeName}] Error parsing JSON body:`, parseError);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  try {
    const groupExists = await prisma.group.findUnique({
      where: { id: parsedData.group_id },
      select: { id: true },
    });
    if (!groupExists) {
      console.log(
        `[ROUTE ${routeName}] Group not found: ${parsedData.group_id}.`
      );
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const isMember = await isUserMemberOfGroup(
      currentUser.id,
      parsedData.group_id
    );
    if (!isMember) {
      console.log(
        `[ROUTE ${routeName}] Forbidden: User ${currentUser.id} is not member of group ${parsedData.group_id}.`
      );
      return NextResponse.json(
        { error: 'Only members of the group can add events.' },
        { status: 403 }
      );
    }
    console.log(`[ROUTE ${routeName}] Authorization successful.`);
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

  try {
    console.log(`[ROUTE ${routeName}] Creating event in DB.`);
    const newEvent = await prisma.event.create({
      data: {
        title: parsedData.title,
        description: parsedData.description,
        question: parsedData.question,
        options: parsedData.options,
        groupId: parsedData.group_id,
        createdById: currentUser.id,
        tippingDeadline: parsedData.tippingDeadline,
      },
    });
    console.log(
      `[ROUTE ${routeName}] Event created successfully with ID: ${newEvent.id}.`
    );
    return NextResponse.json(newEvent, { status: 201 });
  } catch (dbError) {
    console.error(`[ROUTE ${routeName}] Database error:`, dbError);
    return NextResponse.json(
      { error: 'Could not create event.' },
      { status: 500 }
    );
  }
}
