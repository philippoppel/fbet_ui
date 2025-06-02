// src/app/api/services/leadershipService.ts
import { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '@/app/api/lib/prisma';

// Diese Funktion musst du an deine Datenbankstruktur und Punkteberechnung anpassen!
// Sie sollte ein Array von Objekten zurückgeben, die mindestens userId und totalPoints enthalten
// und idealerweise nach totalPoints absteigend sortiert sind.
export async function calculateHighscoresForGroup(
  groupId: number,
  prisma: PrismaClient = defaultPrisma
): Promise<
  Array<{ userId: number; totalPoints: number; name: string | null }>
> {
  console.log(
    `[leadershipService] Calculating highscores for groupId: ${groupId}`
  );
  // BEISPIELHAFTE IMPLEMENTIERUNG - BITTE ANPASSEN!
  // Diese Logik summiert alle Punkte aus der 'Tip'-Tabelle für die gegebene Gruppe.
  const tipsInGroup = await prisma.tip.findMany({
    where: {
      event: {
        groupId: groupId,
      },
      points: { not: null }, // Nur Tipps mit vergebenen Punkten
    },
    select: {
      userId: true,
      points: true,
      user: { select: { name: true, id: true } }, // User-Name und ID für das Objekt
    },
  });

  const userPointsMap: Record<
    number,
    { userId: number; totalPoints: number; name: string | null }
  > = {};

  for (const tip of tipsInGroup) {
    if (!userPointsMap[tip.userId]) {
      userPointsMap[tip.userId] = {
        userId: tip.userId,
        totalPoints: 0,
        name: tip.user.name,
      };
    }
    // Stelle sicher, dass points nicht null ist, bevor du addierst (Prisma macht das oft optional)
    userPointsMap[tip.userId].totalPoints += tip.points ?? 0;
  }

  const highscoresArray = Object.values(userPointsMap);
  highscoresArray.sort((a, b) => b.totalPoints - a.totalPoints); // Absteigend sortieren

  console.log(
    `[leadershipService] Calculated ${highscoresArray.length} highscore entries for groupId: ${groupId}`
  );
  return highscoresArray;
}

export async function updateLeadershipStreaks(
  groupId: number,
  prisma: PrismaClient = defaultPrisma
) {
  console.log(
    `[leadershipService] Attempting to update leadership streaks for groupId: ${groupId}`
  );
  const highscores = await calculateHighscoresForGroup(groupId, prisma);

  if (highscores.length === 0) {
    const endedStreaks = await prisma.leadershipStreak.updateMany({
      where: { groupId: groupId, endedOn: null },
      data: { endedOn: new Date() },
    });
    console.log(
      `[leadershipService] No highscores for group ${groupId}, ended ${endedStreaks.count} active streaks.`
    );
    return;
  }

  const maxPoints = highscores[0].totalPoints;
  // Nur Führende mit einer Mindestpunktzahl berücksichtigen, z.B. >= 0 oder > 0
  // Hier wird angenommen, dass auch 0 Punkte eine Führung sein können, wenn es die höchste Punktzahl ist.
  const currentLeaderUserIds = highscores
    .filter((score) => score.totalPoints === maxPoints /* && maxPoints >= 0 */)
    .map((score) => score.userId);

  if (currentLeaderUserIds.length === 0 && maxPoints < 0) {
    // Fall: Alle haben Minuspunkte, niemand führt wirklich. Alle aktiven Serien beenden.
    const endedStreaks = await prisma.leadershipStreak.updateMany({
      where: { groupId: groupId, endedOn: null },
      data: { endedOn: new Date() },
    });
    console.log(
      `[leadershipService] All scores are negative for group ${groupId}, ended ${endedStreaks.count} active streaks.`
    );
    return;
  }

  const previousActiveStreaks = await prisma.leadershipStreak.findMany({
    where: { groupId: groupId, endedOn: null },
  });
  const previousLeaderUserIds = previousActiveStreaks.map((s) => s.userId);
  const now = new Date();

  let endedCount = 0;
  for (const streak of previousActiveStreaks) {
    if (!currentLeaderUserIds.includes(streak.userId)) {
      await prisma.leadershipStreak.update({
        where: { id: streak.id },
        data: { endedOn: now },
      });
      endedCount++;
    }
  }
  if (endedCount > 0)
    console.log(
      `[leadershipService] Ended ${endedCount} old streaks for group ${groupId}.`
    );

  let startedCount = 0;
  for (const newLeaderUserId of currentLeaderUserIds) {
    const wasPreviouslyActiveLeader = previousActiveStreaks.find(
      (s) => s.userId === newLeaderUserId
    );
    if (!wasPreviouslyActiveLeader) {
      // Nur neue Serie starten, wenn nicht schon aktiv führend
      await prisma.leadershipStreak.create({
        data: {
          groupId: groupId,
          userId: newLeaderUserId,
          becameLeaderOn: now,
          endedOn: null,
        },
      });
      startedCount++;
    }
  }
  if (startedCount > 0)
    console.log(
      `[leadershipService] Started ${startedCount} new streaks for group ${groupId}.`
    );
  if (
    endedCount === 0 &&
    startedCount === 0 &&
    currentLeaderUserIds.length > 0 &&
    previousActiveStreaks.length > 0
  ) {
    console.log(
      `[leadershipService] Leadership unchanged for group ${groupId}. Current leaders: ${currentLeaderUserIds.join(', ')}`
    );
  }
}
