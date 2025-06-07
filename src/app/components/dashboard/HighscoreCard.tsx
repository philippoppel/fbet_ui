'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import type { HighscoreEntry, UserOut } from '@/app/lib/types';
import { cn } from '@/app/lib/utils';
import { updateName } from '@/app/lib/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Trophy, Pencil, User, Users, TriangleAlert } from 'lucide-react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';

function formatLeaderSince(
  leaderSinceDate?: Date | string | null
): string | null {
  if (!leaderSinceDate) return null;
  const date = new Date(leaderSinceDate);
  if (isNaN(date.getTime())) return null;
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  if (diffTime < 0) return null;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Führt seit heute';
  if (diffDays === 1) return 'Führt seit gestern';
  return `Führt seit ${diffDays} Tagen`;
}

export function HighscoreCard({
  highscore,
  members,
  isLoading,
  error,
  currentUserId,
  onReload,
}: {
  highscore: HighscoreEntry[];
  members: UserOut[];
  isLoading: boolean;
  error: string | null;
  currentUserId: number | undefined | null;
  onReload?: () => Promise<void> | void; // reload hook
}) {
  const { token } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
        rank = entry.points > -Infinity || sortedList.length > 0 ? 1 : 0;
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
        rank: rank,
        leaderSince: entry.leaderSince,
      };
    });
  }, [highscore]);

  const memberCount = members?.length ?? 0;

  return (
    <TooltipProvider delayDuration={100}>
      <Card
        id='highscore-card'
        className='bg-muted/30 border border-border rounded-xl shadow-sm h-full flex flex-col overflow-hidden'
      >
        <CardHeader className='flex flex-row items-center justify-between pb-3 pt-4 px-4 sm:px-5'>
          <div className='flex items-center gap-2'>
            <Trophy className='h-5 w-5 text-primary' />
            <CardTitle className='text-base sm:text-lg font-semibold text-foreground'>
              Rangliste
            </CardTitle>
          </div>
          {currentUserId && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button
                      variant='outline'
                      size='sm'
                      className='flex items-center gap-2'
                    >
                      <Pencil className='h-4 w-4' />
                      Namen ändern
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Name ändern</p>
                </TooltipContent>
              </Tooltip>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Deinen Namen ändern</DialogTitle>
                </DialogHeader>
                <div className='space-y-4'>
                  <Input
                    type='text'
                    placeholder='Neuer Name'
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <DialogFooter className='mt-4'>
                  <Button
                    disabled={isSaving || !newName.trim()}
                    onClick={async () => {
                      try {
                        setIsSaving(true);
                        if (!token) {
                          throw new Error(
                            'Kein Token gefunden. Bitte neu einloggen.'
                          );
                        }
                        await updateName(newName.trim(), token);
                        setDialogOpen(false);
                        setNewName('');
                        if (onReload) {
                          await onReload();
                        } else if (typeof window !== 'undefined') {
                          window.location.reload();
                        }
                      } catch (err: any) {
                        alert(`Fehler: ${err.message}`);
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                  >
                    {isSaving ? 'Speichern...' : 'Speichern'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
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
          ) : displayList.length === 0 ||
            displayList.every((e) => e.rank === 0) ? (
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
                  {displayList.map((entry) => {
                    const isPointsLeader =
                      entry.rank === 1 && entry.points > -Infinity;
                    const leaderSinceText = isPointsLeader
                      ? formatLeaderSince(entry.leaderSince)
                      : null;

                    return (
                      <tr
                        key={entry.user_id}
                        className={cn(
                          'transition-colors hover:bg-muted/40',
                          currentUserId === entry.user_id &&
                            'bg-primary/10 dark:bg-primary/20 font-semibold',
                          isPointsLeader &&
                            'bg-yellow-500/15 dark:bg-yellow-500/25 hover:bg-yellow-500/20 dark:hover:bg-yellow-500/30'
                        )}
                      >
                        <td className='py-2.5 px-3 sm:px-4 text-center'>
                          {entry.rank > 0 && (
                            <Badge
                              variant='secondary'
                              className={cn(
                                'font-semibold min-w-[28px] justify-center px-1.5 py-0.5 text-xs rounded-md',
                                isPointsLeader &&
                                  'bg-yellow-400/90 border-yellow-500/50 text-yellow-950 dark:bg-yellow-500/80 dark:text-yellow-950 shadow-md',
                                entry.rank === 2 &&
                                  'bg-slate-300/90 border-slate-400/50 text-slate-950 dark:bg-slate-400/80 dark:text-slate-950',
                                entry.rank === 3 &&
                                  'bg-orange-400/80 border-orange-500/50 text-orange-950 dark:bg-orange-500/70 dark:text-white'
                              )}
                            >
                              {isPointsLeader
                                ? '👑'
                                : entry.rank === 3
                                  ? '🥉'
                                  : entry.rank}
                            </Badge>
                          )}
                        </td>
                        <td className='py-2.5 px-3 sm:px-4'>
                          <div>
                            <div className='flex items-center gap-1.5'>
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
                              <span
                                className={cn(
                                  'truncate text-foreground/90',
                                  entry.isNameFallback && 'opacity-60 italic',
                                  isPointsLeader &&
                                    'font-bold text-yellow-700 dark:text-yellow-600'
                                )}
                                title={entry.name}
                              >
                                {entry.name}
                              </span>
                            </div>
                            {leaderSinceText && (
                              <div className='text-xs text-yellow-600 dark:text-yellow-500/80 mt-0.5'>
                                {leaderSinceText}
                              </div>
                            )}
                          </div>
                        </td>
                        <td
                          className={cn(
                            'py-2.5 px-3 sm:px-4 text-right font-semibold text-foreground/90',
                            entry.points === 0 &&
                              'text-muted-foreground/70 font-normal',
                            isPointsLeader &&
                              'text-yellow-700 dark:text-yellow-600'
                          )}
                        >
                          {entry.points}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
