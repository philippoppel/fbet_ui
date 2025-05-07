// src/components/dashboard/HighscoreCard.tsx
'use client';

import type { HighscoreEntry, UserOut } from '@/app/lib/types'; // Import UserOut statt GroupMembership
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Trophy, User, Users, TriangleAlert } from 'lucide-react';
import { Skeleton } from '@/app/components/ui/skeleton';
import { useMemo } from 'react';
import { cn } from '@/app/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';

// Props Definition - members ist jetzt UserOut[]
type HighscoreCardProps = {
  highscore: HighscoreEntry[]; // Sollte jetzt alle Mitglieder mit Namen/Punkten enthalten
  members: UserOut[]; // Wird für die Mitgliederzahl und ggf. als Fallback benötigt
  isLoading: boolean;
  error: string | null;
  currentUserId: number;
};

// Typ für die intern verwendete Darstellungsliste (unverändert)
type DisplayEntry = {
  user_id: number;
  name: string;
  points: number;
  isNameFallback: boolean;
  rank: number;
};

// Skeleton Komponente (unverändert)
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
            i % 2 !== 0 && 'bg-muted/30'
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

// Die Hauptkomponente (Logik angepasst)
export function HighscoreCard({
  highscore, // Diese Prop enthält jetzt die vollständigen Daten vom Backend
  members, // Diese Prop wird für die Gesamtzahl der Mitglieder verwendet
  isLoading,
  error,
  currentUserId,
}: HighscoreCardProps) {
  // useMemo Hook zur Berechnung der anzuzeigenden Liste und Ränge
  // Hängt jetzt primär von 'highscore' ab
  const displayList = useMemo((): DisplayEntry[] => {
    // Die 'highscore'-Prop sollte bereits alle Mitglieder enthalten,
    // sortiert nach Punkten (absteigend) und Namen (aufsteigend) vom Backend.
    const sortedList = highscore ?? [];

    // Rangberechnung (unverändert)
    let rank = 0;
    let lastPoints = -Infinity;
    let playersAtRank = 1;
    return sortedList.map((entry, index): DisplayEntry => {
      if (entry.points < lastPoints) {
        rank += playersAtRank;
        playersAtRank = 1;
      } else if (index > 0 && entry.points === lastPoints) {
        playersAtRank++;
      } else if (index === 0) {
        rank = 1;
        playersAtRank = 1;
      }
      lastPoints = entry.points;

      // Überprüfe, ob der Name, der vom Backend kommt, ein Fallback ist.
      // Die Backend-Logik verwendet "User {ID}" oder E-Mail-Präfix als Fallback.
      // Wir können hier eine ähnliche Prüfung machen.
      const fallbackNamePattern1 = `User ${entry.user_id}`;
      // Eine einfache Annahme für E-Mail-Präfix Fallback (könnte verfeinert werden)
      const isLikelyEmailPrefix =
        !entry.name.includes(' ') && entry.name.includes('@') === false; // Beispielhafte Annahme
      const isNameFallback =
        entry.name === fallbackNamePattern1 ||
        (isLikelyEmailPrefix && entry.name !== `User ${entry.user_id}`); // Anpassbare Logik

      return {
        user_id: entry.user_id,
        name: entry.name, // Name kommt jetzt direkt aus dem highscore-Eintrag
        points: entry.points,
        isNameFallback: isNameFallback,
        rank: rank,
      };
    });
  }, [highscore]); // Abhängigkeit ist jetzt nur noch highscore

  // Memoisierten Wert für die Anzeige der Fallback-Info berechnen (unverändert)
  const hasFallbackNames = useMemo(
    () => displayList.some((e) => e.isNameFallback),
    [displayList]
  );

  // Anzahl der Mitglieder für die Anzeige im Leerzustand
  const memberCount = members?.length ?? 0;

  // JSX Rendering der Komponente
  return (
    <TooltipProvider delayDuration={100}>
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
          ) : memberCount === 0 ? ( // Prüfe zuerst, ob überhaupt Mitglieder da sind
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
          ) : displayList.length === 0 && memberCount > 0 ? (
            // Zustand: Mitglieder da, aber Highscore-Liste (aus irgendeinem Grund) leer
            // Sollte mit der neuen Backend-Logik nicht oft vorkommen, außer bei Fehlern im Backend, die [] liefern
            <div className='flex flex-col items-center justify-center h-full text-muted-foreground px-4 text-center py-10'>
              <Trophy className='h-12 w-12 opacity-50 mb-4' />
              <p className='text-sm'>
                Rangliste wird berechnet oder ist noch leer.
              </p>
            </div>
          ) : (
            // Normalzustand (Tabelle anzeigen, auch wenn alle 0 Punkte haben)
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
                          'bg-primary/10 font-semibold border-l-2 border-primary'
                      )}
                    >
                      {/* Rang Spalte */}
                      <td className='py-2.5 px-2 align-middle text-center'>
                        <Badge
                          variant={
                            entry.rank === 1
                              ? 'default'
                              : entry.rank === 2
                                ? 'secondary'
                                : entry.rank === 3
                                  ? 'outline'
                                  : 'secondary'
                          }
                          className={cn(
                            'font-semibold min-w-[24px] justify-center px-1.5 py-0.5 text-xs',
                            entry.rank === 1 && 'bg-yellow-500 text-black',
                            entry.rank === 2 && 'bg-slate-400 text-black',
                            entry.rank === 3 && 'bg-orange-600 text-white'
                          )}
                        >
                          {entry.rank}
                        </Badge>
                      </td>
                      {/* Name Spalte */}
                      <td className='py-2.5 px-3 align-middle flex items-center gap-1.5'>
                        {entry.isNameFallback && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
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
                            'truncate',
                            entry.isNameFallback && 'opacity-80 italic'
                          )}
                          title={entry.name}
                        >
                          {entry.name}
                        </span>
                      </td>
                      {/* Punkte Spalte */}
                      <td
                        className={cn(
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
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
