// src/components/dashboard/HighscoreCard.tsx
'use client';

import type { HighscoreEntry, GroupMembership } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, User, Users, TriangleAlert } from 'lucide-react'; // Icons aktualisiert
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  // *** WICHTIG: Sicherstellen, dass diese importiert sind ***
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Props Definition
type HighscoreCardProps = {
  highscore: HighscoreEntry[];
  members: GroupMembership[]; // Enthält KEINEN Namen laut types.ts
  isLoading: boolean;
  error: string | null;
  currentUserId: number; // ID des eingeloggten Users
};

// Typ für die intern verwendete Darstellungsliste
type DisplayEntry = {
  user_id: number;
  name: string; // Der anzuzeigende Name (kann Fallback sein)
  points: number;
  isNameFallback: boolean; // Flag, ob der Fallback-Name verwendet wird
  rank: number;
};

// Skeleton Komponente für den Ladezustand
function HighscoreSkeleton() {
  return (
    <div className='w-full space-y-1 pt-1 px-1'>
      {/* Header Skeleton */}
      <div className='flex items-center justify-between h-10 px-2 text-sm font-medium text-muted-foreground border-b'>
        <Skeleton className='h-4 w-10 rounded' />
        <Skeleton className='h-4 w-2/5 rounded' />
        <Skeleton className='h-4 w-1/6 rounded' />
      </div>
      {/* Row Skeletons */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className={cn(
            'flex items-center justify-between px-2 py-3 border-b',
            i % 2 !== 0 && 'bg-muted/30' // Simulate alternating background
          )}
        >
          <Skeleton className='h-6 w-8 rounded-md' /> {/* Rank Badge */}
          <Skeleton className='h-4 w-1/2 rounded' /> {/* Name */}
          <Skeleton className='h-4 w-1/5 rounded' /> {/* Points */}
        </div>
      ))}
    </div>
  );
}

// Die Hauptkomponente
export function HighscoreCard({
  highscore,
  members,
  isLoading,
  error,
  currentUserId,
}: HighscoreCardProps) {
  // useMemo Hook zur Berechnung der anzuzeigenden Liste und Ränge
  const displayList = useMemo((): DisplayEntry[] => {
    // 1. Map der Highscore-Einträge für schnellen Zugriff über user_id
    const highscoreMap = new Map<number, HighscoreEntry>(
      highscore?.map((entry) => [entry.user_id, entry]) ?? []
    );

    // 2. Filtern der gültigen Mitglieder (nur um die Liste aller User-IDs zu erhalten)
    const validMembers = Array.isArray(members)
      ? members.filter(
          (member) => member && typeof member.user_id !== 'undefined'
        )
      : [];

    // 3. Erstellen der Basis-Liste mit Namen und Punkten
    const combinedList = validMembers.map(
      (member): Omit<DisplayEntry, 'rank'> => {
        const userId = member.user_id;
        const highscoreEntry = highscoreMap.get(userId); // Passender Highscore-Eintrag

        // --- Korrigierte Namenslogik ---
        const entryName = highscoreEntry?.name?.trim(); // Name aus HighscoreEntry holen
        const fallbackName = `User ${userId}`; // Standard Fallback definieren

        // Prüfen, ob der Name aus HighscoreEntry existiert und NICHT dem Fallback-Muster "User {ID}" entspricht
        const isProvidedNameValid =
          !!entryName && !entryName.startsWith(fallbackName);

        // Anzuzeigenden Namen und Fallback-Status festlegen
        const displayName = isProvidedNameValid ? entryName : fallbackName;
        const isNameFallback = !isProvidedNameValid;
        // --- Ende Korrigierte Namenslogik ---

        const points = highscoreEntry?.points ?? 0; // Punkte holen (oder 0)

        return {
          user_id: userId,
          name: displayName,
          points: points,
          isNameFallback: isNameFallback,
        };
      }
    );

    // 4. Sortieren der Liste (Punkte absteigend, dann Name aufsteigend)
    const sortedList = combinedList.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.name.localeCompare(b.name); // Stabile Sortierung bei Punktegleichstand
    });

    // 5. Rangberechnung (Berücksichtigt gleiche Ränge bei Punktegleichstand)
    let rank = 0;
    let lastPoints = -Infinity;
    let playersAtRank = 1; // Anzahl Spieler mit dem aktuellen Rang
    return sortedList.map((entry, index): DisplayEntry => {
      if (entry.points < lastPoints) {
        // Niedrigere Punktzahl als der vorherige -> Neuer Rang
        rank += playersAtRank; // Erhöhe Rang um Anzahl der Spieler auf dem vorherigen Rang
        playersAtRank = 1; // Reset für den neuen Rang
      } else if (index > 0 && entry.points === lastPoints) {
        // Gleiche Punktzahl wie der vorherige -> Gleicher Rang, erhöhe Spieleranzahl
        playersAtRank++;
      } else if (index === 0) {
        // Erster Spieler in der Liste
        rank = 1;
        playersAtRank = 1;
      }
      // Wenn Punkte gleich sind, bleibt 'rank' unverändert -> gleicher Rang

      lastPoints = entry.points; // Punktzahl für nächsten Vergleich merken
      return { ...entry, rank }; // Füge den berechneten Rang zum Eintrag hinzu
    });
  }, [members, highscore]); // Abhängigkeiten des useMemo

  // Memoisierten Wert für die Anzeige der Fallback-Info berechnen
  const hasFallbackNames = useMemo(
    () => displayList.some((e) => e.isNameFallback),
    [displayList]
  );

  // JSX Rendering der Komponente
  return (
    <TooltipProvider delayDuration={100}>
      {' '}
      {/* Ein Provider für alle Tooltips hier drin */}
      <Card className='shadow-sm border h-full flex flex-col'>
        <CardHeader className='py-3 px-4 border-b'>
          <CardTitle className='text-lg font-semibold flex items-center gap-2'>
            <Trophy className='w-5 h-5 text-primary' /> Rangliste
          </CardTitle>
        </CardHeader>

        <CardContent className='flex-1 overflow-y-auto p-0'>
          {isLoading ? (
            <HighscoreSkeleton /> // Ladezustand
          ) : error ? (
            // Fehlerzustand
            <div className='flex flex-col items-center justify-center h-full text-destructive px-4 text-center py-10'>
              <TriangleAlert className='h-10 w-10 mb-3' />
              <p className='text-sm font-medium'>Fehler beim Laden:</p>
              <p className='text-sm text-destructive/90 mt-1'>{error}</p>
            </div>
          ) : !Array.isArray(members) || members.length === 0 ? (
            // Leerzustand (keine Mitglieder)
            <div className='flex flex-col items-center justify-center h-full text-muted-foreground px-4 text-center py-10'>
              <Users className='h-12 w-12 opacity-50 mb-4' />
              <p className='text-sm'>
                Keine Mitglieder in dieser Gruppe gefunden.
              </p>
              <p className='text-xs mt-1'>
                Lade Freunde über den Beitrittslink ein!
              </p>
            </div>
          ) : (
            // Normalzustand (Tabelle anzeigen)
            <div className='w-full'>
              <table className='w-full caption-bottom text-sm'>
                <thead className='sticky top-0 bg-card z-10'>
                  <tr className='border-b'>
                    <th className='h-10 px-2 text-center align-middle font-medium text-muted-foreground w-[60px]'>
                      Rang
                    </th>
                    <th className='h-10 px-3 text-left align-middle font-medium text-muted-foreground'>
                      Name
                    </th>
                    <th className='h-10 px-3 text-right align-middle font-medium text-muted-foreground w-[70px]'>
                      Punkte
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayList.map((entry) => (
                    <tr
                      key={entry.user_id}
                      className={cn(
                        'border-b transition-colors',
                        'even:bg-muted/30 hover:bg-muted/50',
                        entry.user_id === currentUserId &&
                          'bg-primary/10 font-semibold border-l-2 border-primary' // Aktuellen User hervorheben
                      )}
                    >
                      {/* Rang Spalte */}
                      <td className='py-2.5 px-2 align-middle text-center'>
                        <Badge
                          variant={
                            /* Dynamische Badge Variante */
                            entry.rank === 1
                              ? 'default'
                              : entry.rank === 2
                                ? 'secondary'
                                : entry.rank === 3
                                  ? 'outline'
                                  : 'secondary'
                          }
                          className={cn(
                            /* Dynamische Badge Klassen */
                            'font-semibold min-w-[24px] justify-center px-1.5 py-0.5 text-xs',
                            entry.rank === 1 && 'bg-yellow-500 text-black', // Gold
                            entry.rank === 2 && 'bg-slate-400 text-black', // Silber
                            entry.rank === 3 && 'bg-orange-600 text-white' // Bronze
                          )}
                        >
                          {entry.rank}
                        </Badge>
                      </td>
                      {/* Name Spalte */}
                      <td className='py-2.5 px-3 align-middle flex items-center gap-1.5'>
                        {entry.isNameFallback && ( // Icon + Tooltip für Fallback-Namen
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                {' '}
                                {/* Span als Trigger für Tooltip */}
                                <User className='w-3.5 h-3.5 text-muted-foreground flex-shrink-0 opacity-70' />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Nur User-ID #{entry.user_id} verfügbar.</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <span
                          className={cn(
                            // Name anzeigen (ggf. kursiv/ausgegraut)
                            'truncate', // Abschneiden bei Überlänge
                            entry.isNameFallback && 'opacity-80 italic'
                          )}
                          title={entry.name} // Voller Name im HTML-Tooltip
                        >
                          {entry.name}
                        </span>
                      </td>
                      {/* Punkte Spalte */}
                      <td
                        className={cn(
                          // Punkte anzeigen (ggf. anders bei 0)
                          'py-2.5 px-3 align-middle text-right font-semibold',
                          entry.points === 0 &&
                            'text-muted-foreground font-normal opacity-80'
                        )}
                      >
                        {entry.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Info zu Fallback-Namen nur anzeigen, wenn vorhanden */}
              {hasFallbackNames && (
                <p className='text-xs text-muted-foreground mt-3 mb-2 px-3 italic'>
                  <User className='inline w-3 h-3 mr-1 opacity-70' /> = Name
                  nicht gesetzt (nur User-ID).
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
