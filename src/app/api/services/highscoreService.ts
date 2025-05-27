// src/app/api/services/highscoreService.ts
import { prisma } from '@/app/api/lib/prisma';
import type { HighscoreEntry } from '@/app/lib/types';

export async function getHighscoreForGroup(
  groupId: number
): Promise<HighscoreEntry[]> {
  console.log(`[highscoreService] Getting highscore for groupId: ${groupId}`);
  try {
    // 1. Alle Mitglieder der Gruppe holen (ID, Name, E-Mail)
    const members = await prisma.user.findMany({
      where: {
        groupMemberships: {
          some: {
            groupId: groupId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true, // Für besseren Fallback-Namen
      },
    });

    if (members.length === 0) {
      console.log(
        `[highscoreService] No members found for groupId: ${groupId}. Returning empty array.`
      );
      return []; // Keine Mitglieder, keine Rangliste
    }

    // 2. Punkte pro User sammeln (nur für diese Mitglieder)
    const memberIds = members.map((member) => member.id);
    const scoresByUserId = await prisma.tip.groupBy({
      by: ['userId'],
      where: {
        userId: {
          in: memberIds, // Nur Tipps von Gruppenmitgliedern
        },
        event: {
          groupId: groupId, // Nur Tipps für Events in dieser Gruppe
        },
      },
      _sum: {
        points: true,
      },
    });

    // Map für schnellen Zugriff auf die Punkte
    const scoreMap = new Map<number, number>();
    scoresByUserId.forEach((score) => {
      if (score.userId !== null) {
        scoreMap.set(score.userId, score._sum.points ?? 0);
      }
    });
    console.log(
      `[highscoreService] Found scores for ${scoreMap.size} members.`
    );

    // 3. Highscore-Einträge für ALLE Mitglieder erstellen
    const highscore: HighscoreEntry[] = members
      .map((member) => {
        const points = scoreMap.get(member.id) ?? 0; // Punkte aus Map holen oder 0

        // Bessere Fallback-Logik für Namen
        let displayName = `User ${member.id}`; // Absoluter Fallback
        if (member.name && member.name.trim() !== '') {
          displayName = member.name.trim();
        } else if (member.email) {
          displayName = member.email.split('@')[0]; // E-Mail-Präfix als Fallback
        }

        return {
          user_id: member.id,
          name: displayName,
          points: points,
        };
      })
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name)); // Nach Punkten, dann nach Name sortieren

    console.log(
      `[highscoreService] Successfully computed highscore for groupId: ${groupId}. Entries: ${highscore.length}`
    );
    return highscore;
  } catch (error) {
    console.error(
      `[highscoreService] Error in getHighscoreForGroup for groupId ${groupId}:`,
      error
    );
    // Im Fehlerfall leeres Array zurückgeben, um den Client nicht abstürzen zu lassen
    // Der Fehler wird bereits geloggt.
    return [];
  }
}
