'use client';

import type { HighscoreEntry, UserOut } from '@/app/lib/types';
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

export function HighscoreCard({
  highscore,
  members,
  isLoading,
  error,
  currentUserId,
  groupLeaderId, // Wichtig: Diese ID muss von der Elternkomponente korrekt übergeben werden!
}: {
  highscore: HighscoreEntry[];
  members: UserOut[];
  isLoading: boolean;
  error: string | null;
  currentUserId: number | undefined | null;
  groupLeaderId: number | undefined | null; // ID des Gruppenführers
}) {
  const displayList = useMemo(() => {
    const sortedList = highscore ?? [];
    let rank = 0;
    let lastPoints = -Infinity;
    let playersAtRank = 1;
    return sortedList.map((entry, index) => {
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

      const fallbackNamePattern1 = `User ${entry.user_id}`;
      const isLikelyEmailPrefix =
        !entry.name.includes(' ') &&
        !entry.name.includes('@') &&
        entry.name.length > 0 &&
        entry.name.length < 25 &&
        !/\d{7,}/.test(entry.name);

      const isNameFallback =
        entry.name === fallbackNamePattern1 ||
        (isLikelyEmailPrefix &&
          entry.name.toLowerCase() !== entry.name &&
          !entry.name.match(/[A-Z][a-z]/));

      return {
        user_id: entry.user_id,
        name: entry.name,
        points: entry.points,
        isNameFallback,
        rank,
      };
    });
  }, [highscore]);

  const memberCount = members?.length ?? 0;

  return (
    <TooltipProvider delayDuration={100}>
      <Card className='bg-muted/30 border border-border rounded-xl shadow-sm h-full flex flex-col overflow-hidden'>
        <CardHeader className='flex flex-row items-center gap-2 pb-3 pt-4 px-4 sm:px-5'>
          <Trophy className='h-5 w-5 text-primary' />
          <CardTitle className='text-base sm:text-lg font-semibold text-foreground'>
            Rangliste
          </CardTitle>
        </CardHeader>
        <CardContent className='flex-1 overflow-y-auto p-0 flex flex-col'>
          {isLoading ? (
            <div className='w-full p-2 sm:p-0'>
              <div className='sticky top-0 z-10 bg-muted/50 backdrop-blur-sm'>
                <div className='flex items-center justify-between h-10 px-3 sm:px-4 text-sm font-medium border-b border-border/70'>
                  <Skeleton className='h-4 w-10 rounded bg-muted' />
                  <Skeleton className='h-4 w-2/5 rounded bg-muted' />
                  <Skeleton className='h-4 w-1/6 rounded bg-muted' />
                </div>
              </div>
              <div className='space-y-0 px-1 sm:px-2'>
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-center justify-between px-2 sm:px-3 py-3 border-b border-border/50',
                      i % 2 === 0 && 'bg-muted/20'
                    )}
                  >
                    <Skeleton className='h-6 w-8 rounded-md bg-muted' />
                    <Skeleton className='h-4 w-1/2 rounded bg-muted' />
                    <Skeleton className='h-4 w-1/5 rounded bg-muted' />
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className='flex flex-col items-center justify-center h-full text-destructive px-4 text-center py-10 m-auto'>
              <TriangleAlert className='h-10 w-10 mb-3 opacity-70' />
              <p className='text-sm font-semibold'>Fehler beim Laden:</p>
              <p className='text-sm text-destructive/80 mt-1'>{error}</p>
            </div>
          ) : memberCount === 0 ? (
            <div className='flex flex-col items-center justify-center h-full text-muted-foreground px-4 text-center py-10 m-auto'>
              <Users className='h-12 w-12 opacity-40 mb-4' />
              <p className='text-sm'>
                Keine Mitglieder in dieser Gruppe gefunden.
              </p>
              <p className='text-xs mt-1'>
                Lade Freunde über den Beitrittslink ein!
              </p>
            </div>
          ) : displayList.length === 0 ? (
            <div className='flex flex-col items-center justify-center h-full text-muted-foreground px-4 text-center py-10 m-auto'>
              <Trophy className='h-12 w-12 opacity-40 mb-4' />
              <p className='text-sm'>
                Rangliste wird berechnet oder ist noch leer.
              </p>
            </div>
          ) : (
            <div className='w-full relative flex-1 overflow-y-auto'>
              <table className='w-full caption-bottom text-sm'>
                <thead className='sticky top-0 z-10 bg-muted/50 backdrop-blur-sm shadow-sm'>
                  <tr className='border-b border-border/70'>
                    <th className='h-10 px-3 sm:px-4 text-center font-medium text-muted-foreground w-[70px] sm:w-[80px]'>
                      Rang
                    </th>
                    <th className='h-10 px-3 sm:px-4 text-left font-medium text-muted-foreground'>
                      Name
                    </th>
                    <th className='h-10 px-3 sm:px-4 text-right font-medium text-muted-foreground w-[80px] sm:w-[90px]'>
                      Punkte
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border/30'>
                  {displayList.map((entry) => (
                    <tr
                      key={entry.user_id}
                      className={cn(
                        'transition-colors hover:bg-muted/40',
                        currentUserId === entry.user_id &&
                          'bg-primary/10 dark:bg-primary/20 font-semibold'
                      )}
                    >
                      <td className='py-2.5 px-3 sm:px-4 text-center'>
                        <Badge
                          variant='secondary' // Basis-Variante, wird unten überschrieben für spezielle Ränge
                          className={cn(
                            'font-semibold min-w-[28px] justify-center px-1.5 py-0.5 text-xs rounded-md',
                            entry.rank === 1 &&
                              'bg-yellow-400/90 border-yellow-500/50 text-yellow-950 dark:bg-yellow-500/80 dark:text-yellow-950',
                            entry.rank === 2 && // Styling für Rang 2 (Silber-Look ohne Emoji)
                              'bg-slate-300/90 border-slate-400/50 text-slate-950 dark:bg-slate-400/80 dark:text-slate-950',
                            entry.rank === 3 &&
                              'bg-orange-400/80 border-orange-500/50 text-orange-950 dark:bg-orange-500/70 dark:text-white'
                            // Ränge 4+ verwenden das Standard-Styling von variant='secondary' (im Bild braun)
                          )}
                        >
                          {entry.rank === 1
                            ? '🥇'
                            : entry.rank === 3
                              ? '🥉'
                              : entry.rank}{' '}
                          {/* Zeigt Zahl für Rang 2 und andere */}
                        </Badge>
                      </td>
                      <td className='py-2.5 px-3 sm:px-4 flex items-center gap-1.5'>
                        {/* Gruppenführer-Emoji wird hier zuerst angezeigt, falls zutreffend */}
                        {entry.user_id === groupLeaderId && (
                          <span
                            title='Gruppenführer'
                            className='inline-flex items-center'
                          >
                            👑
                          </span>
                        )}
                        {/* Icon und Tooltip für Fallback-Namen */}
                        {entry.isNameFallback && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <User className='h-3.5 w-3.5 opacity-60 cursor-help text-muted-foreground' />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className='text-xs'>
                                Name nicht verfügbar (ID: {entry.user_id})
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {/* Name des Nutzers */}
                        <span
                          className={cn(
                            'truncate text-foreground/90', // Lässt Text bei Bedarf abschneiden
                            entry.isNameFallback && 'opacity-60 italic'
                          )}
                          title={entry.name} // Zeigt vollen Namen bei Hover, falls abgeschnitten
                        >
                          {entry.name}
                        </span>
                      </td>
                      <td
                        className={cn(
                          'py-2.5 px-3 sm:px-4 text-right font-semibold text-foreground/90',
                          entry.points === 0 &&
                            'text-muted-foreground/70 font-normal'
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
