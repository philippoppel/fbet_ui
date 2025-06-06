'use client';

import React, { useMemo, useState, useEffect } from 'react';
import type {
  Event as GroupEvent,
  UserOut,
  AllTipsPerEvent,
} from '@/app/lib/types';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/app/components/ui/collapsible';
import { CheckCircle2, Search, X, ChevronsUpDown } from 'lucide-react';
import { CommentSection } from '@/app/components/dashboard/CommentSection';
import { cn } from '@/app/lib/utils';

export type ClosedEventsCardProps = {
  events: GroupEvent[];
  user: UserOut;
  allTipsPerEvent: AllTipsPerEvent;
  groupMemberCount?: number;
};

const ITEMS_PER_PAGE = 5;

export default function ClosedEventsCard({
  events,
  user,
  allTipsPerEvent,
  groupMemberCount,
}: ClosedEventsCardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    const base = events
      .filter((e): e is GroupEvent => !!e && e.winningOption !== null)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    const search = searchTerm.trim().toLowerCase();
    return search
      ? base.filter(
          (e) =>
            e.title?.toLowerCase().includes(search) ||
            e.question?.toLowerCase().includes(search) ||
            e.winningOption?.toLowerCase().includes(search)
        )
      : base;
  }, [events, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtered]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedEvents = filtered.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <TooltipProvider delayDuration={100}>
      <Card className='bg-muted/30 border border-border rounded-xl shadow-sm'>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className='flex flex-row items-center justify-between gap-2 pb-3 pr-3 sm:pr-4 pt-4 sm:pt-5'>
            <div className='flex items-center gap-2'>
              <CheckCircle2 className='h-5 w-5 text-green-500 dark:text-green-400 flex-shrink-0' />
              <CardTitle className='text-base sm:text-lg font-semibold text-foreground'>
                Abgeschlossene Wetten
              </CardTitle>
            </div>
            <div className='flex items-center gap-1'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8 text-muted-foreground hover:text-foreground'
                    onClick={(e) => {
                      e.stopPropagation(); // Prevents collapsible trigger
                    }}
                  >
                    <Search className='h-4 w-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Wetten durchsuchen</TooltipContent>
              </Tooltip>
              <CollapsibleTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 text-muted-foreground hover:text-foreground'
                >
                  <ChevronsUpDown className='h-4 w-4' />
                  <span className='sr-only'>Ein-/Ausklappen</span>
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <div className='px-4 sm:px-6 pb-3 pt-1'>
              <div className='relative'>
                <Input
                  type='text'
                  placeholder='Titel, Frage, Gewinner durchsuchen...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='w-full pr-10 h-9 text-sm'
                />
                {searchTerm && (
                  <Button
                    variant='ghost'
                    size='icon'
                    className='absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-destructive'
                    onClick={() => setSearchTerm('')}
                  >
                    <X className='h-4 w-4' />
                  </Button>
                )}
              </div>
            </div>

            <CardContent
              className={cn(
                'space-y-6 pt-2 pb-4 px-4 sm:px-6',
                paginatedEvents.length === 0 &&
                  'flex flex-col items-center justify-center py-10 text-center'
              )}
            >
              {paginatedEvents.length === 0 ? (
                <>
                  <CheckCircle2 className='w-14 h-14 text-muted-foreground/25 mb-3' />
                  <p className='max-w-xs text-sm text-muted-foreground'>
                    {searchTerm
                      ? 'Keine abgeschlossenen Wetten entsprechen deiner Suche.'
                      : 'Keine abgeschlossenen Wetten vorhanden.'}
                  </p>
                </>
              ) : (
                paginatedEvents.map((event) => {
                  const tips = allTipsPerEvent[event.id] ?? [];
                  const tipDistribution = new Map<string, number>();
                  tips.forEach((tip) => {
                    tipDistribution.set(
                      tip.selectedOption,
                      (tipDistribution.get(tip.selectedOption) ?? 0) + 1
                    );
                  });

                  const numberOfTipper = event.awardedPoints?.length ?? 0;

                  return (
                    <div
                      key={event.id}
                      className='rounded-xl bg-card border border-border p-4 sm:p-5 shadow-sm space-y-4'
                    >
                      <div className='space-y-1'>
                        <h4 className='text-lg font-semibold text-foreground leading-tight break-words'>
                          {event.title}
                        </h4>
                        {event.question && (
                          <p className='text-sm text-muted-foreground break-words max-w-prose'>
                            {event.question}
                          </p>
                        )}
                      </div>

                      <div>
                        <div className='text-xs uppercase text-primary/80 font-semibold tracking-wide mb-1'>
                          Ergebnis
                        </div>
                        <div className='text-xl font-bold text-foreground break-words'>
                          {event.winningOption}
                        </div>
                      </div>

                      <div className='text-sm text-muted-foreground space-y-1'>
                        {event.tippingDeadline && (
                          <div>
                            Tipp-Deadline:{' '}
                            {new Date(
                              event.tippingDeadline
                            ).toLocaleDateString()}
                          </div>
                        )}
                        {event.updatedAt && (
                          <div>
                            Ausgewertet am:{' '}
                            {new Date(event.updatedAt).toLocaleDateString()}
                          </div>
                        )}
                        <div>
                          Tipper:{' '}
                          {groupMemberCount
                            ? `${numberOfTipper} von ${groupMemberCount}`
                            : `${numberOfTipper}`}{' '}
                          Teilnehmer
                        </div>
                      </div>

                      {tipDistribution.size > 0 && (
                        <div className='p-3 bg-muted/50 dark:bg-black/20 rounded-md border border-primary/30 space-y-2'>
                          <h5 className='font-semibold text-xs text-foreground/90 uppercase tracking-wide mb-2'>
                            Verteilung der Tipps
                          </h5>
                          <ul className='space-y-1 text-sm'>
                            {[...tipDistribution.entries()].map(
                              ([option, count]) => (
                                <li
                                  key={option}
                                  className='flex justify-between text-foreground'
                                >
                                  <span>{option}</span>
                                  <span className='font-medium'>{count}</span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                      {tips.length > 0 && (
                        <div className='p-3 bg-muted/50 dark:bg-black/20 rounded-md border border-primary/30 space-y-2'>
                          <h5 className='font-semibold text-xs text-foreground/90 uppercase tracking-wide mb-2'>
                            Tipps der Mitglieder
                          </h5>
                          <ul className='space-y-1 text-sm'>
                            {tips.map((tip) => (
                              <li
                                key={tip.userId}
                                className='flex justify-between text-foreground'
                              >
                                <span>
                                  {tip.userName || `User ${tip.userId}`}
                                </span>
                                <span className='font-medium'>
                                  {tip.selectedOption}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {event.awardedPoints &&
                        event.awardedPoints.length > 0 && (
                          <div className='p-3 bg-muted/50 dark:bg-black/20 rounded-md border border-primary/30 space-y-2'>
                            <h5 className='font-semibold text-xs text-foreground/90 uppercase tracking-wide mb-2'>
                              Punkteverteilung
                            </h5>
                            <ul className='space-y-1 text-sm'>
                              {event.awardedPoints.map((p) => {
                                const wildcardPoints =
                                  (p as any).wildcardPoints ?? 0;
                                const hasWildcard =
                                  event.hasWildcard && wildcardPoints > 0;

                                return (
                                  <li
                                    key={p.userId}
                                    className='flex justify-between text-foreground'
                                  >
                                    <span>
                                      {p.userName || `User ${p.userId}`}
                                    </span>
                                    <span className='font-medium'>
                                      {p.points ?? 0} Pkt.
                                      {hasWildcard && (
                                        <span className='ml-2 text-xs text-primary/80'>
                                          (+ Wildcard 🎯)
                                        </span>
                                      )}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                      <div>
                        <CommentSection eventId={event.id} currentUser={user} />
                      </div>
                    </div>
                  );
                })
              )}

              {/* Pagination controls: only shown if there's more than one page */}
              {totalPages > 1 && (
                <div className='flex items-center justify-between pt-4 mt-4 border-t border-border'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                  >
                    Zurück
                  </Button>
                  <span className='text-sm text-muted-foreground'>
                    Seite {currentPage} von {totalPages}
                  </span>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                  >
                    Weiter
                  </Button>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </TooltipProvider>
  );
}
