'use client';

import type { HighscoreEntry, UserOut } from '@/app/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Trophy, User, Users, TriangleAlert, Crown } from 'lucide-react';
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
}: {
  highscore: HighscoreEntry[];
  members: UserOut[];
  isLoading: boolean;
  error: string | null;
  currentUserId: number | undefined | null;
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
        entry.name.length < 20;
      const isNameFallback =
        entry.name === fallbackNamePattern1 ||
        (isLikelyEmailPrefix && entry.name !== `User ${entry.user_id}`);

      return {
        user_id: entry.user_id,
        name: entry.name,
        points: entry.points,
        isNameFallback,
        rank,
      };
    });
  }, [highscore]);

  const hasFallbackNames = useMemo(
    () => displayList.some((e) => e.isNameFallback),
    [displayList]
  );
  const memberCount = members?.length ?? 0;

  return (
    <TooltipProvider delayDuration={100}>
      <Card className='shadow-md h-full flex flex-col overflow-hidden bg-background/60 dark:bg-slate-900/50 backdrop-blur-lg border border-white/10 dark:border-white/5 rounded-lg'>
        <CardHeader className='py-3 px-4 border-b border-white/10 dark:border-white/5'>
          <CardTitle className='text-lg font-semibold flex items-center gap-2 text-foreground'>
            <Trophy className='w-5 h-5 text-primary' /> Rangliste
          </CardTitle>
        </CardHeader>
        <CardContent className='flex-1 overflow-y-auto p-0'>
          {isLoading ? (
            <div className='w-full'>
              <div className='sticky top-0 z-10 bg-background/80 dark:bg-slate-900/70 backdrop-blur-sm'>
                <div className='flex items-center justify-between h-10 px-2 text-sm font-medium border-b border-white/10 dark:border-white/5'>
                  <Skeleton className='h-4 w-10 rounded bg-muted/50' />
                  <Skeleton className='h-4 w-2/5 rounded bg-muted/50' />
                  <Skeleton className='h-4 w-1/6 rounded bg-muted/50' />
                </div>
              </div>
              <div className='space-y-0 px-1'>
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-center justify-between px-2 py-3 border-b border-white/10 dark:border-white/5',
                      i % 2 === 0 && 'bg-white/5 dark:bg-black/10'
                    )}
                  >
                    <Skeleton className='h-6 w-8 rounded-md bg-muted/40' />
                    <Skeleton className='h-4 w-1/2 rounded bg-muted/40' />
                    <Skeleton className='h-4 w-1/5 rounded bg-muted/40' />
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className='flex flex-col items-center justify-center h-full text-destructive px-4 text-center py-10'>
              <TriangleAlert className='h-10 w-10 mb-3' />
              <p className='text-sm font-medium'>Fehler beim Laden:</p>
              <p className='text-sm text-destructive/90 mt-1'>{error}</p>
            </div>
          ) : memberCount === 0 ? (
            <div className='flex flex-col items-center justify-center h-full text-muted-foreground px-4 text-center py-10'>
              <Users className='h-12 w-12 opacity-50 mb-4' />
              <p className='text-sm'>
                Keine Mitglieder in dieser Gruppe gefunden.
              </p>
              <p className='text-xs mt-1'>
                Lade Freunde über den Beitrittslink ein!
              </p>
            </div>
          ) : displayList.length === 0 ? (
            <div className='flex flex-col items-center justify-center h-full text-muted-foreground px-4 text-center py-10'>
              <Trophy className='h-12 w-12 opacity-50 mb-4' />
              <p className='text-sm'>
                Rangliste wird berechnet oder ist noch leer.
              </p>
            </div>
          ) : (
            <div className='w-full'>
              <table className='w-full caption-bottom text-sm'>
                <thead className='sticky top-0 z-10 bg-background/80 dark:bg-slate-900/70 backdrop-blur-sm'>
                  <tr className='border-b border-white/10 dark:border-white/5'>
                    <th className='h-10 px-2 text-center font-medium text-muted-foreground w-[60px]'>
                      Rang
                    </th>
                    <th className='h-10 px-3 text-left font-medium text-muted-foreground'>
                      Name
                    </th>
                    <th className='h-10 px-3 text-right font-medium text-muted-foreground w-[70px]'>
                      Punkte
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-white/5 dark:divide-white/[0.03]'>
                  {displayList.map((entry) => (
                    <tr
                      key={entry.user_id}
                      className={cn(
                        'transition-colors hover:bg-white/10 dark:hover:bg-black/15',
                        currentUserId === entry.user_id &&
                          'bg-primary/10 dark:bg-primary/20 font-semibold ring-1 ring-primary/50 shadow-inner'
                      )}
                    >
                      <td className='py-2.5 px-2 text-center'>
                        <Badge
                          variant='secondary'
                          className={cn(
                            'font-semibold min-w-[24px] justify-center px-1.5 py-0.5 text-xs',
                            entry.rank === 1 &&
                              'bg-yellow-500/90 border-yellow-600/50 text-black dark:text-yellow-950',
                            entry.rank === 2 &&
                              'bg-slate-400/90 border-slate-500/50 text-black dark:text-slate-950',
                            entry.rank === 3 &&
                              'bg-orange-600/80 border-orange-700/50 text-white dark:text-orange-100'
                          )}
                        >
                          {entry.rank === 1
                            ? '🥇'
                            : entry.rank === 2
                              ? '🥈'
                              : entry.rank === 3
                                ? '🥉'
                                : entry.rank}
                        </Badge>
                      </td>
                      <td className='py-2.5 px-3 flex items-center gap-1.5'>
                        {entry.isNameFallback && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <User className='w-3.5 h-3.5 text-muted-foreground opacity-70' />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className='bg-popover text-popover-foreground border-border'>
                              <p>Nur User-ID #{entry.user_id} verfügbar.</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <span
                          className={cn(
                            'truncate text-foreground/90',
                            entry.isNameFallback && 'opacity-70 italic'
                          )}
                          title={entry.name}
                        >
                          {entry.name}
                        </span>
                      </td>
                      <td
                        className={cn(
                          'py-2.5 px-3 text-right font-semibold text-foreground/90',
                          entry.points === 0 &&
                            'text-muted-foreground font-normal opacity-70'
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
