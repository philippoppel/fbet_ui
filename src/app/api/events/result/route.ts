// src/app/api/events/result/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';
import { getCurrentUserFromRequest, AuthenticatedUser } from '../../lib/auth';
import { eventResultSetSchema } from '../../lib/eventSchema';
// NEUER IMPORT:
import { updateLeadershipStreaks } from '../../services/leadershipService'; // Pfad ggf. anpassen

export async function POST(req: NextRequest) {
  const routeName = '/api/events/result';
  console.log(`[ROUTE ${routeName}] POST request received.`);

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

  try {
    const eventForAuth = await prisma.event.findUnique({
      // Umbenannt für Klarheit
      where: { id: eventId },
      select: {
        groupId: true,
        options: true,
        winningOption: true,
        group: { select: { createdById: true } },
      },
    });

    if (!eventForAuth)
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    if (eventForAuth.winningOption !== null)
      return NextResponse.json(
        { error: 'Result for this event has already been set.' },
        { status: 400 }
      );
    if (
      !eventForAuth.group ||
      eventForAuth.group.createdById !== currentUser.id
    )
      return NextResponse.json(
        { error: 'Only the group creator can set event results.' },
        { status: 403 }
      );
    if (
      !Array.isArray(eventForAuth.options) ||
      !(eventForAuth.options as string[]).includes(winningOption)
    )
      return NextResponse.json(
        { error: `'${winningOption}' is not a valid option for this event.` },
        { status: 400 }
      );

    console.log(
      `[ROUTE ${routeName}] Auth and validation successful for event ${eventId}.`
    );

    const transactionResult = await prisma.$transaction(async (tx) => {
      const updatedEvent = await tx.event.update({
        where: { id: eventId },
        data: { winningOption: winningOption },
        // Wichtig: groupId hier selektieren, falls sie für die Antwort benötigt wird
        // oder wenn sie nicht standardmäßig im updatedEvent-Objekt enthalten wäre.
        // Standardmäßig sind Scalar-Felder wie groupId aber enthalten.
      });
      console.log(
        `[ROUTE ${routeName}] Event ${eventId} updated with winningOption: ${winningOption}.`
      );

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
        return {
          updatedEvent,
          pointsUpdatedCount: 0,
          groupId: updatedEvent.groupId,
        }; // groupId für Außenseite
      }

      const winningTips = allTipsForEvent.filter(
        (tip) => tip.selectedOption === winningOption
      );
      const correctTipstersCount = winningTips.length;
      console.log(
        `[ROUTE ${routeName}] ${correctTipstersCount} users tipped correctly.`
      );

      let pointsUpdatedCount = 0;
      for (const tip of allTipsForEvent) {
        let pointsToAward = 0;
        if (tip.selectedOption === winningOption) {
          pointsToAward = 2;
          if (correctTipstersCount === 1) pointsToAward += 3;
          else if (correctTipstersCount >= 2 && correctTipstersCount <= 3)
            pointsToAward += 2;
          else if (correctTipstersCount >= 4 && correctTipstersCount <= 5)
            pointsToAward += 1;
        }
        await tx.tip.update({
          where: { id: tip.id },
          data: { points: pointsToAward },
        });
        // Zähle nur, wenn Punkte tatsächlich > 0 sind oder sich geändert haben (hier vereinfacht)
        if (pointsToAward > 0) {
          pointsUpdatedCount++;
        }
      }
      console.log(
        `[ROUTE ${routeName}] Points calculation done for ${allTipsForEvent.length} tips, ${pointsUpdatedCount} received points.`
      );
      return {
        updatedEvent,
        pointsUpdatedCount,
        groupId: updatedEvent.groupId,
      }; // groupId für Außenseite
    });

    // --- Leadership Streaks aktualisieren NACH erfolgreicher Transaktion ---
    if (transactionResult && transactionResult.groupId) {
      try {
        await updateLeadershipStreaks(transactionResult.groupId, prisma);
        console.log(
          `[ROUTE ${routeName}] Leadership streaks successfully updated for group ${transactionResult.groupId}.`
        );
      } catch (streakError) {
        console.error(
          `[ROUTE ${routeName}] Error updating leadership streaks for group ${transactionResult.groupId}:`,
          streakError
        );
        // Fehler beim Streak-Update sollte die Hauptantwort nicht blockieren
      }
    } else {
      console.warn(
        `[ROUTE ${routeName}] Could not update leadership streaks: groupId not available from transaction result.`
      );
    }

    // Sende nur die relevanten Teile des Events zurück oder eine Erfolgsmeldung
    return NextResponse.json(
      {
        message: 'Event result processed and points awarded.',
        eventId: transactionResult.updatedEvent.id,
        winningOption: transactionResult.updatedEvent.winningOption,
        pointsUpdatedForWinners: transactionResult.pointsUpdatedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      `[ROUTE ${routeName}] Error processing event result for event ${eventId}:`,
      error
    );
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      {
        error: 'Could not set event result or calculate points.',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
