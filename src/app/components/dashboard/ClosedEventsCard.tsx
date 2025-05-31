'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { Event as GroupEvent, UserOut } from '@/app/lib/types';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/app/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';
import {
  CheckCircle2,
  ChevronsUpDown,
  Archive,
  ArchiveRestore,
  Eye,
  EyeOff,
  Search,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { CommentSection } from '@/app/components/dashboard/CommentSection';

/**
 * A cleaned‑up & layout‑safe Version of the original ClosedEventsCard.
 * Hauptänderung: das Event‑Item benutzt jetzt ein Grid‑Layout (1fr + auto),
 * sodass der „Ergebnis“-Block außerhalb der Kopfzeile steht und stets die volle
 * Kartenbreite einnimmt. Dadurch verschwindet der störende Versatz zwischen
 * Ergebnis‑ und Punkteverteilungs‑Box.
 */

export type ClosedEventsCardProps = {
  events: GroupEvent[];
  user: UserOut;
};

const STORAGE_KEY = 'closedEventsArchivedEventIds';

export default function ClosedEventsCard({
  events,
  user,
}: ClosedEventsCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [archivedEventIds, setArchivedEventIds] = useState<Set<number>>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (
            Array.isArray(parsed) &&
            parsed.every((i) => typeof i === 'number')
          ) {
            return new Set(parsed as number[]);
          }
        } catch (err) {
          console.warn(
            '[ClosedEventsCard] Fehler beim Parsen archivedEventIds:',
            err
          );
        }
      }
    }
    return new Set();
  });
  const [showArchived, setShowArchived] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());

  /* --------------------------------------------------
   * Persist Archiv‑Status
   * -------------------------------------------------- */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(Array.from(archivedEventIds))
      );
    }
  }, [archivedEventIds]);

  /* --------------------------------------------------
   * Helfer
   * -------------------------------------------------- */
  const toggleArchive = (id: number) =>
    setArchivedEventIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const togglePointDetails = (id: number) =>
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  /* --------------------------------------------------
   * Filtering & Sorting
   * -------------------------------------------------- */
  const filtered = useMemo(() => {
    const base = events
      .filter((e): e is GroupEvent => !!e && e.winningOption !== null)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    const search = searchTerm.trim().toLowerCase();
    const bySearch = search
      ? base.filter(
          (e) =>
            e.title?.toLowerCase().includes(search) ||
            e.question?.toLowerCase().includes(search) ||
            e.winningOption?.toLowerCase().includes(search)
        )
      : base;

    const active = bySearch.filter((e) => !archivedEventIds.has(e.id));
    const archived = bySearch.filter((e) => archivedEventIds.has(e.id));

    return { active, archived };
  }, [events, searchTerm, archivedEventIds]);

  /* --------------------------------------------------
   * Einzelnes Event‑Item
   * -------------------------------------------------- */
  const renderEvent = (event: GroupEvent, isArchived: boolean) => (
    <div
      key={event.id}
      className={cn(
        'rounded-xl bg-card border border-border p-4 sm:p-5 shadow-sm transition-colors space-y-4',
        isArchived && 'opacity-70 hover:opacity-100'
      )}
    >
      {/* Header: Titel & Icons */}
      <div className='grid grid-cols-[1fr_auto] gap-3'>
        {/* Linke Spalte */}
        <div className='space-y-1 min-w-0'>
          <h4 className='text-base font-semibold text-foreground leading-tight break-words'>
            {event.title}
          </h4>
          {event.question && (
            <p className='text-sm text-muted-foreground break-words max-w-prose'>
              {event.question}
            </p>
          )}
        </div>

        {/* Rechte Spalte: Icons */}
        <div className='flex items-start gap-1 flex-none'>
          {!!event.awardedPoints?.length && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 text-muted-foreground hover:text-primary'
                  onClick={() => togglePointDetails(event.id)}
                >
                  {expandedEvents.has(event.id) ? (
                    <ChevronDown className='h-4 w-4' />
                  ) : (
                    <ChevronRight className='h-4 w-4' />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Punkteverteilung</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8 text-muted-foreground hover:text-foreground'
                onClick={() => toggleArchive(event.id)}
              >
                {isArchived ? (
                  <ArchiveRestore className='h-4 w-4' />
                ) : (
                  <Archive className='h-4 w-4' />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isArchived ? 'Wiederherstellen' : 'Wette archivieren'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Content: Ergebnis + Kommentare */}
      <div className='space-y-3'>
        <div>
          <div className='text-xs uppercase text-primary/80 font-semibold tracking-wide'>
            Ergebnis
          </div>
          <div className='text-foreground font-medium break-words'>
            {event.winningOption}
          </div>
        </div>

        <CommentSection eventId={event.id} currentUser={user} />
      </div>

      {/* Punkteverteilung */}
      {expandedEvents.has(event.id) && (
        <div className='pl-3 py-2 bg-muted/50 dark:bg-black/20 rounded-md text-sm border-l-2 border-primary/50 space-y-1'>
          <h5 className='font-semibold text-xs text-foreground/90 uppercase tracking-wide'>
            Punkteverteilung:
          </h5>
          <ul className='space-y-1 text-xs'>
            {event.awardedPoints?.map((p) => (
              <li
                key={p.userId}
                className='flex justify-between text-muted-foreground'
              >
                <span>{p.userName || `User ${p.userId}`}</span>
                <span className='font-medium text-foreground/80'>
                  {p.points ?? 0} Pkt.
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  /* --------------------------------------------------
   * Render
   * -------------------------------------------------- */
  return (
    <TooltipProvider delayDuration={100}>
      <Card className='bg-muted/30 border border-border rounded-xl shadow-sm'>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          {/* Kopfzeile */}
          <CardHeader className='flex flex-row items-center justify-between gap-2 pb-3 pr-3 sm:pr-4'>
            <div className='flex items-center gap-2'>
              <CheckCircle2 className='h-5 w-5 text-green-500 dark:text-green-400' />
              <CardTitle className='text-base sm:text-lg font-semibold text-foreground'>
                Abgeschlossene Wetten
              </CardTitle>
            </div>
            <div className='flex items-center gap-1'>
              {/* Suche */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8 text-muted-foreground hover:text-foreground'
                    onClick={() => setIsSearchVisible(!isSearchVisible)}
                  >
                    <Search className='h-4 w-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Wetten durchsuchen</TooltipContent>
              </Tooltip>

              {/* Archiv anzeigen */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => setShowArchived(!showArchived)}
                    className='h-8 w-8 text-muted-foreground hover:text-foreground'
                  >
                    {showArchived ? (
                      <EyeOff className='h-4 w-4' />
                    ) : (
                      <Eye className='h-4 w-4' />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Archiv anzeigen/ausblenden</TooltipContent>
              </Tooltip>

              {/* Auf/Zu */}
              <CollapsibleTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 text-muted-foreground hover:text-foreground'
                >
                  <ChevronsUpDown className='h-4 w-4' />
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>

          {/* Suchfeld */}
          {isSearchVisible && (
            <div className='px-4 sm:px-6 pb-3'>
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
          )}

          {/* Inhalt */}
          <CollapsibleContent>
            <CardContent className='space-y-6 pt-2 pb-4'>
              {filtered.active.map((e) => renderEvent(e, false))}
              {showArchived &&
                filtered.archived.map((e) => renderEvent(e, true))}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </TooltipProvider>
  );
}
