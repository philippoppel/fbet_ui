// src/app/api/events/result/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';
import { getCurrentUserFromRequest, AuthenticatedUser } from '../../lib/auth';
import { eventResultSetSchema } from '../../lib/eventSchema';

export async function POST(req: NextRequest) {
  const routeName = '/api/events/result';
  console.log(`[ROUTE ${routeName}] POST request received.`);

  // 1. Authentifizierung (unverändert)
  let currentUser: AuthenticatedUser | null = null;
  try {
    currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
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
  let parsedData: { event_id: number; winning_option: string };
  try {
    const json = await req.json();
    const parsed = eventResultSetSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    parsedData = parsed.data;
  } catch (parseError) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { event_id: eventId, winning_option: winningOption } = parsedData;

  // 3. Autorisierung & Vorab-Validierung des Events (unverändert)
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        groupId: true,
        options: true,
        winningOption: true,
        group: { select: { createdById: true } },
      },
    });

    if (!event)
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    if (event.winningOption !== null)
      return NextResponse.json(
        { error: 'Result for this event has already been set.' },
        { status: 400 }
      );
    if (!event.group || event.group.createdById !== currentUser.id)
      return NextResponse.json(
        { error: 'Only the group creator can set event results.' },
        { status: 403 }
      );
    if (
      !Array.isArray(event.options) ||
      !(event.options as string[]).includes(winningOption)
    )
      return NextResponse.json(
        { error: `'${winningOption}' is not a valid option for this event.` },
        { status: 400 }
      );

    console.log(
      `[ROUTE ${routeName}] Auth and validation successful for event ${eventId}.`
    );

    // --- 4. Event-Ergebnis setzen UND PUNKTE BERECHNEN (in einer Transaktion) ---
    const transactionResult = await prisma.$transaction(async (tx) => {
      // 4a. Event aktualisieren
      const updatedEvent = await tx.event.update({
        where: { id: eventId },
        data: { winningOption: winningOption },
      });
      console.log(
        `[ROUTE ${routeName}] Event ${eventId} updated with winningOption: ${winningOption}.`
      );

      // 4b. Alle Tipps für dieses Event holen (nur userId und selectedOption werden für die Logik benötigt)
      const allTipsForEvent = await tx.tip.findMany({
        where: { eventId: eventId },
        select: { id: true, userId: true, selectedOption: true },
      });
      console.log(
        `[ROUTE ${routeName}] Found ${allTipsForEvent.length} tips for event ${eventId}.`
      );

      if (allTipsForEvent.length === 0) {
        console.log(
          `[ROUTE ${routeName}] No tips submitted for this event. No points to calculate.`
        );
        return { updatedEvent, pointsUpdatedCount: 0 };
      }

      // 4c. Zählen, wie viele die richtige Option getippt haben
      const winningTips = allTipsForEvent.filter(
        (tip) => tip.selectedOption === winningOption
      );
      const correctTipstersCount = winningTips.length;
      console.log(
        `[ROUTE ${routeName}] ${correctTipstersCount} users tipped correctly.`
      );

      let pointsUpdatedCount = 0;

      // 4d. Punkte für jeden Tipp berechnen und Tipps aktualisieren
      for (const tip of allTipsForEvent) {
        let pointsToAward = 0; // Standard: 0 Punkte für falsche Tipps
        if (tip.selectedOption === winningOption) {
          // Kicktipp-ähnliche Logik anwenden
          pointsToAward = 2; // Grundpunkte für richtigen Tipp

          if (correctTipstersCount === 1) {
            // Nur einer hat richtig getippt
            pointsToAward += 3; // z.B. +3 Bonuspunkte
          } else if (correctTipstersCount >= 2 && correctTipstersCount <= 3) {
            pointsToAward += 2; // z.B. +2 Bonuspunkte
          } else if (correctTipstersCount >= 4 && correctTipstersCount <= 5) {
            pointsToAward += 1; // z.B. +1 Bonuspunkt
          }
          // Wenn correctTipstersCount > 5, gibt es nur die Grundpunkte
        }

        await tx.tip.update({
          where: { id: tip.id },
          data: { points: pointsToAward },
        });
        if (tip.selectedOption === winningOption) {
          pointsUpdatedCount++;
        }
      }
      console.log(
        `[ROUTE ${routeName}] Points updated for ${pointsUpdatedCount} tips (winners might be more if points were already 0 for losers).`
      );
      return { updatedEvent, pointsUpdatedCount };
    });

    return NextResponse.json(transactionResult.updatedEvent, { status: 200 });
  } catch (error) {
    console.error(
      `[ROUTE ${routeName}] Error processing event result for event ${eventId}:`,
      error
    );
    return NextResponse.json(
      { error: 'Could not set event result or calculate points.' },
      { status: 500 }
    );
  }
}
