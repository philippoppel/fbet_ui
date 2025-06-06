// src/app/api/events/result/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';
import { getCurrentUserFromRequest } from '../../lib/auth';
import { eventResultSetSchema } from '../../lib/eventSchema';
import { updateLeadershipStreaks } from '../../services/leadershipService';

const basePoints = (winnerCount: number) =>
  winnerCount === 1 ? 5 : Math.max(1, 5 - (winnerCount - 1));

export async function POST(req: NextRequest) {
  const routeName = '/api/events/result';
  console.log(`[ROUTE ${routeName}] POST request received.`);

  /* ---------- Auth ---------- */
  const currentUser = await getCurrentUserFromRequest(req);
  if (!currentUser)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  /* ---------- Payload ---------- */
  const parsed = eventResultSetSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  const { event_id, winning_option, wildcard_answer } = parsed.data;

  /* ---------- Berechtigung ---------- */
  const eventInfo = await prisma.event.findUnique({
    where: { id: event_id },
    select: {
      groupId: true,
      options: true,
      hasWildcard: true,
      winningOption: true,
      group: { select: { createdById: true } },
    },
  });
  if (!eventInfo)
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  if (eventInfo.winningOption)
    return NextResponse.json({ error: 'Result already set' }, { status: 400 });
  if (eventInfo.group.createdById !== currentUser.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!(eventInfo.options as string[]).includes(winning_option))
    return NextResponse.json(
      { error: 'Invalid winning option' },
      { status: 400 }
    );
  if (wildcard_answer && !eventInfo.hasWildcard)
    return NextResponse.json(
      { error: 'Wildcard not configured' },
      { status: 400 }
    );

  /* ---------- Transaktion ---------- */
  const { tips } = await prisma.$transaction(async (tx) => {
    const updatedEvent = await tx.event.update({
      where: { id: event_id },
      data: {
        winningOption: winning_option,
        wildcardAnswer: wildcard_answer ?? null,
      },
    });

    const tips = await tx.tip.findMany({ where: { eventId: event_id } });
    const winners = tips.filter((t) => t.selectedOption === winning_option);
    const bp = basePoints(winners.length);

    await Promise.all(
      tips.map((t) => {
        const normal = t.selectedOption === winning_option;
        const wcOK = wildcard_answer
          ? (t.wildcardGuess?.trim().toLowerCase() ?? '') ===
            wildcard_answer.trim().toLowerCase()
          : false;

        let pts = 0;
        let wpts = 0;
        if (normal) pts = bp;
        if (wcOK) wpts = bp;
        if (normal && wcOK) pts = bp * 2;

        return tx.tip.update({
          where: { id: t.id },
          data: { points: pts, wildcardPoints: wpts },
        });
      })
    );
    return { tips, groupId: updatedEvent.groupId };
  });

  /* ---------- Leadership Streaks ---------- */
  try {
    await updateLeadershipStreaks(eventInfo.groupId, prisma);
  } catch (err) {
    console.error('[Streak] update error:', err);
  }

  return NextResponse.json({ ok: true, winners: tips.length });
}
