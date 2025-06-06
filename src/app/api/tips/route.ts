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

  /* ---------- Auth ---------- */
  const currentUser = await getCurrentUserFromRequest(req);
  if (!currentUser)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  /* ---------- Payload ---------- */
  let dto: {
    event_id: number;
    selected_option: string;
    wildcard_guess?: string;
  };
  const parsed = tipCreateSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  dto = parsed.data;

  /* ---------- Event-Checks ---------- */
  const event = await prisma.event.findUnique({
    where: { id: dto.event_id },
    select: {
      winningOption: true,
      options: true,
      groupId: true,
      tippingDeadline: true,
      hasWildcard: true,
    },
  });
  if (!event)
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  if (event.winningOption)
    return NextResponse.json({ error: 'Event closed' }, { status: 400 });
  if (event.tippingDeadline && new Date() > event.tippingDeadline)
    return NextResponse.json({ error: 'Deadline passed' }, { status: 400 });
  if (
    !Array.isArray(event.options) ||
    !(event.options as string[]).includes(dto.selected_option)
  )
    return NextResponse.json({ error: 'Invalid option' }, { status: 400 });
  if (!event.hasWildcard && dto.wildcard_guess)
    return NextResponse.json(
      { error: 'Wildcard not allowed' },
      { status: 400 }
    );

  /* ---------- Membership ---------- */
  const membership = await prisma.groupMembership.findUnique({
    where: {
      uq_user_group: { userId: currentUser.id, groupId: event.groupId },
    },
  });
  if (!membership)
    return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  /* ---------- Upsert ---------- */
  const tip = await prisma.tip.upsert({
    where: {
      unique_tip_per_user_per_event: {
        userId: currentUser.id,
        eventId: dto.event_id,
      },
    },
    update: {
      selectedOption: dto.selected_option,
      wildcardGuess: dto.wildcard_guess ?? null,
    },
    create: {
      userId: currentUser.id,
      eventId: dto.event_id,
      selectedOption: dto.selected_option,
      wildcardGuess: dto.wildcard_guess ?? null,
    },
  });
  return NextResponse.json(tip);
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
