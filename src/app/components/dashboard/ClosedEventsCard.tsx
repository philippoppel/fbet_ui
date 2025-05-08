// src/components/dashboard/ClosedEventsCard.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import type { Event as GroupEvent, EventPointDetail } from '@/app/lib/types';
import {
  Card,
  // CardContent, // Wird durch div ersetzt für mehr Styling-Kontrolle
  // CardHeader, // Wird durch div ersetzt
  CardTitle, // Behalten für semantische Korrektheit
} from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
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
  Users, // Users Icon nicht direkt verwendet hier, aber ggf. für Leerzustände
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';

type ClosedEventsCardProps = {
  events: GroupEvent[]; // Sollte jetzt 'awardedPoints' enthalten
};

const STORAGE_KEY = 'closedEventsArchivedEventIds';

export function ClosedEventsCard({ events }: ClosedEventsCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [archivedEventIds, setArchivedEventIds] = useState<Set<number>>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (
            Array.isArray(parsed) &&
            parsed.every((item) => typeof item === 'number')
          ) {
            return new Set(parsed as number[]);
          }
        } catch (e) {
          console.warn(
            '[ClosedEventsCard] Fehler beim initialen Parsen von archivedEventIds:',
            e
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(Array.from(archivedEventIds))
      );
    }
  }, [archivedEventIds]);

  const handleToggleArchive = (eventId: number) => {
    setArchivedEventIds((prev) => {
      const next = new Set(prev);
      next.has(eventId) ? next.delete(eventId) : next.add(eventId);
      return next;
    });
  };

  const toggleEventPointDetails = (eventId: number) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      next.has(eventId) ? next.delete(eventId) : next.add(eventId);
      return next;
    });
  };

  const {
    activeClosedEvents,
    archivedClosedEvents,
    hasAnyClosedEventsToShow,
    hasArchivedEventsToShow,
    totalArchivedCount,
    totalClosedEventCount,
  } = useMemo(() => {
    const baseAllClosedEvents = Array.isArray(events)
      ? events
          .filter(
            (event): event is GroupEvent =>
              !!event &&
              typeof event.id === 'number' &&
              typeof event.winningOption === 'string'
          )
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ) // Neueste abgeschlossene zuerst
      : [];

    const filteredBySearchTerm =
      searchTerm.trim() === ''
        ? baseAllClosedEvents
        : baseAllClosedEvents.filter((event) => {
            const lowerSearchTerm = searchTerm.toLowerCase();
            return (
              event.title?.toLowerCase().includes(lowerSearchTerm) ||
              event.description?.toLowerCase().includes(lowerSearchTerm) ||
              event.question?.toLowerCase().includes(lowerSearchTerm) ||
              event.winningOption?.toLowerCase().includes(lowerSearchTerm) // Suche auch nach Gewinner
            );
          });

    const active = filteredBySearchTerm.filter(
      (event) => !archivedEventIds.has(event.id)
    );
    const archived = filteredBySearchTerm.filter((event) =>
      archivedEventIds.has(event.id)
    );
    const allArchivedFromBase = baseAllClosedEvents.filter((event) =>
      archivedEventIds.has(event.id)
    );

    return {
      activeClosedEvents: active,
      archivedClosedEvents: archived,
      hasAnyClosedEventsToShow: filteredBySearchTerm.length > 0,
      hasArchivedEventsToShow: archived.length > 0,
      totalArchivedCount: allArchivedFromBase.length,
      totalClosedEventCount: baseAllClosedEvents.length,
    };
  }, [events, archivedEventIds, searchTerm]);

  return (
    <TooltipProvider delayDuration={100}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className='w-full'>
        {/* Angepasster Container (ersetzt Card) */}
        <div
          className={cn(
            'shadow-md overflow-hidden',
            'bg-background/60 dark:bg-slate-900/50 backdrop-blur-lg supports-[backdrop-filter]:bg-background/70',
            'border border-white/10 dark:border-white/5 rounded-lg'
          )}
        >
          {/* Angepasster Header */}
          <div className='py-3 px-4 space-y-2 border-b border-white/10 dark:border-white/5'>
            <div className='flex flex-row items-center justify-between'>
              <CardTitle className='flex items-center gap-2 text-lg font-semibold text-foreground'>
                <CheckCircle2 className='w-5 h-5 text-green-500 dark:text-green-400' />
                Abgeschlossene Wetten
              </CardTitle>
              <div className='flex items-center gap-1'>
                {/* Icons/Buttons im Header */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8 text-muted-foreground hover:text-foreground'
                      onClick={() => setIsSearchVisible(!isSearchVisible)}
                      data-state={isSearchVisible ? 'on' : 'off'}
                    >
                      <Search className='h-4 w-4' />{' '}
                      <span className='sr-only'>
                        {isSearchVisible ? 'Suche ausblenden' : 'Suchen'}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className='bg-popover text-popover-foreground border-border'>
                    <p>
                      {isSearchVisible
                        ? 'Suche ausblenden'
                        : 'Wetten durchsuchen'}
                    </p>
                  </TooltipContent>
                </Tooltip>
                {totalArchivedCount > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-8 w-8 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground text-muted-foreground hover:text-foreground'
                        onClick={() => setShowArchived(!showArchived)}
                        data-state={showArchived ? 'on' : 'off'}
                      >
                        {showArchived ? (
                          <EyeOff className='h-4 w-4' />
                        ) : (
                          <Eye className='h-4 w-4' />
                        )}{' '}
                        <span className='sr-only'>
                          {showArchived
                            ? 'Archiv ausblenden'
                            : 'Archiv anzeigen'}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className='bg-popover text-popover-foreground border-border'>
                      <p>
                        {showArchived ? 'Archiv ausblenden' : 'Archiv anzeigen'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
                <CollapsibleTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='w-9 h-8 p-0 text-muted-foreground hover:text-foreground'
                  >
                    <ChevronsUpDown className='h-4 w-4' />{' '}
                    <span className='sr-only'>Toggle</span>
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
            {/* Suchfeld mit angepasstem Styling */}
            {isSearchVisible && (
              <div className='relative pt-1'>
                <Input
                  type='text'
                  placeholder='Titel, Frage, Gewinner durchsuchen...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='w-full pr-8 h-9 text-sm bg-background/50 dark:bg-black/20 border-border/50 focus:border-primary/50 focus:ring-primary/20' // Angepasstes Input-Styling
                />
                {searchTerm && (
                  <Button
                    variant='ghost'
                    size='icon'
                    className='absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-destructive'
                    onClick={() => setSearchTerm('')}
                    aria-label='Suche löschen'
                  >
                    {' '}
                    <X className='h-4 w-4' />{' '}
                  </Button>
                )}
              </div>
            )}
          </div>

          <CollapsibleContent>
            {/* Angepasster Content-Bereich */}
            <div className='pt-2 pb-4 px-3 md:px-4 space-y-4'>
              {/* Leere Zustände (unverändert) */}
              {!totalClosedEventCount && (
                <div className='text-center py-10 text-muted-foreground text-sm'>
                  {' '}
                  <CheckCircle2 className='mx-auto h-10 w-10 opacity-50 mb-3' />{' '}
                  <p>Es gibt noch keine abgeschlossenen Wetten.</p>{' '}
                </div>
              )}
              {totalClosedEventCount > 0 &&
                !hasAnyClosedEventsToShow &&
                searchTerm && (
                  <div className='text-center py-10 text-muted-foreground text-sm'>
                    {' '}
                    <Search className='mx-auto h-10 w-10 opacity-50 mb-3' />{' '}
                    <p>
                      {' '}
                      Keine abgeschlossenen Wetten entsprechen deiner Suche "
                      {searchTerm}".{' '}
                    </p>{' '}
                  </div>
                )}
              {activeClosedEvents.length === 0 &&
                totalArchivedCount > 0 &&
                !showArchived &&
                !searchTerm &&
                hasAnyClosedEventsToShow && (
                  <p className='text-muted-foreground text-sm px-2 py-4 italic'>
                    {' '}
                    Keine aktiven abgeschlossenen Wetten sichtbar.{' '}
                    {totalArchivedCount} archiviert (
                    <Button
                      variant='link'
                      className='p-0 h-auto text-xs italic'
                      onClick={() => {
                        setShowArchived(true);
                      }}
                    >
                      {' '}
                      anzeigen{' '}
                    </Button>
                    ).{' '}
                  </p>
                )}

              {/* Aktive, nicht archivierte Events */}
              {activeClosedEvents.length > 0 && (
                <ul className='space-y-0'>
                  {' '}
                  {/* Kein Y-Abstand, Trennung durch border */}
                  {activeClosedEvents.map((event, index) => (
                    <li
                      key={event.id}
                      className={cn(
                        'py-4', // Vertikales Padding
                        index < activeClosedEvents.length - 1
                          ? 'border-b border-white/10 dark:border-white/5'
                          : '' // Trennlinie
                      )}
                    >
                      <div className='flex items-start justify-between gap-3'>
                        <div className='space-y-1 flex-1'>
                          <div className='text-sm font-medium text-foreground'>
                            {event.title}
                          </div>
                          {event.question && (
                            <div className='text-muted-foreground text-xs'>
                              {event.question}
                            </div>
                          )}
                          <Badge
                            variant='outline'
                            className='text-xs font-normal border-primary/30 text-primary/90 bg-primary/10'
                          >
                            Gewinner: {event.winningOption}
                          </Badge>
                        </div>
                        <div className='flex items-center flex-shrink-0'>
                          {' '}
                          {/* flex-shrink-0 hinzugefügt */}
                          {event.awardedPoints &&
                            event.awardedPoints.length > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant='ghost'
                                    size='icon'
                                    className='h-7 w-7 mr-1 text-muted-foreground hover:text-primary'
                                    onClick={() =>
                                      toggleEventPointDetails(event.id)
                                    }
                                  >
                                    {expandedEvents.has(event.id) ? (
                                      <ChevronDown className='h-4 w-4' />
                                    ) : (
                                      <ChevronRight className='h-4 w-4' />
                                    )}
                                    <span className='sr-only'>
                                      Punktedetails
                                    </span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className='bg-popover text-popover-foreground border-border'>
                                  <p>Punkteverteilung</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-foreground'
                                onClick={() => handleToggleArchive(event.id)}
                              >
                                <Archive className='h-3.5 w-3.5' />{' '}
                                <span className='sr-only'>Archivieren</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className='bg-popover text-popover-foreground border-border'>
                              <p>Wette archivieren</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                      {/* Aufklappbare Punktedetails */}
                      {expandedEvents.has(event.id) &&
                        event.awardedPoints &&
                        event.awardedPoints.length > 0 && (
                          <div className='mt-3 ml-2 pl-3 pr-2 py-2 bg-white/5 dark:bg-black/10 rounded-md text-xs border-l-2 border-primary/30'>
                            {' '}
                            {/* Angepasstes Styling */}
                            <h5 className='font-semibold mb-1.5 text-xs text-foreground/90'>
                              Punkteverteilung:
                            </h5>
                            <ul className='space-y-0.5'>
                              {event.awardedPoints.map((detail) => (
                                <li
                                  key={detail.userId}
                                  className='flex justify-between text-muted-foreground'
                                >
                                  <span>
                                    {' '}
                                    {detail.userName || `User ${detail.userId}`}
                                    :{' '}
                                  </span>
                                  <span className='font-medium text-foreground/80'>
                                    {' '}
                                    {detail.points ?? 0} Pkt.{' '}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </li>
                  ))}
                </ul>
              )}

              {/* Archivierte Events */}
              {showArchived && archivedClosedEvents.length > 0 && (
                <div className='mt-6 pt-4 border-t border-white/10 dark:border-white/5'>
                  <h4 className='text-sm font-medium text-muted-foreground mb-3'>
                    Archiv ({archivedClosedEvents.length}
                    {searchTerm &&
                    archivedClosedEvents.length !== totalArchivedCount
                      ? ' gefiltert von ' + totalArchivedCount
                      : ''}
                    )
                  </h4>
                  <ul className='space-y-0 divide-y-0'>
                    {' '}
                    {/* Kein Y-Abstand, Trennung durch border */}
                    {archivedClosedEvents.map((event, index) => (
                      <li
                        key={event.id}
                        className={cn(
                          'py-3 opacity-70 hover:opacity-100 transition-opacity',
                          index < archivedClosedEvents.length - 1
                            ? 'border-b border-white/5 dark:border-white/5'
                            : '' // Subtilere Trennlinie im Archiv
                        )}
                      >
                        <div className='flex items-start justify-between gap-3'>
                          <div className='space-y-1 flex-1'>
                            <div className='text-sm font-medium'>
                              {event.title}
                            </div>
                            {event.question && (
                              <div className='text-muted-foreground text-xs'>
                                {event.question}
                              </div>
                            )}
                            <Badge
                              variant='outline'
                              className='text-xs font-normal border-border/50'
                            >
                              {' '}
                              Gewinner: {event.winningOption}{' '}
                            </Badge>
                          </div>
                          <div className='flex items-center flex-shrink-0'>
                            {' '}
                            {/* flex-shrink-0 hinzugefügt */}
                            {event.awardedPoints &&
                              event.awardedPoints.length > 0 && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant='ghost'
                                      size='icon'
                                      className='h-7 w-7 mr-1 text-muted-foreground hover:text-primary'
                                      onClick={() =>
                                        toggleEventPointDetails(event.id)
                                      }
                                    >
                                      {expandedEvents.has(event.id) ? (
                                        <ChevronDown className='h-4 w-4' />
                                      ) : (
                                        <ChevronRight className='h-4 w-4' />
                                      )}
                                      <span className='sr-only'>
                                        Punktedetails
                                      </span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className='bg-popover text-popover-foreground border-border'>
                                    <p>Punkteverteilung</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  className='h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-foreground'
                                  onClick={() => handleToggleArchive(event.id)}
                                >
                                  <ArchiveRestore className='h-3.5 w-3.5' />{' '}
                                  <span className='sr-only'>
                                    Wiederherstellen
                                  </span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className='bg-popover text-popover-foreground border-border'>
                                <p>Wiederherstellen</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                        {/* Aufklappbare Punktedetails (auch für archivierte) */}
                        {expandedEvents.has(event.id) &&
                          event.awardedPoints &&
                          event.awardedPoints.length > 0 && (
                            <div className='mt-3 ml-2 pl-3 pr-2 py-2 bg-white/5 dark:bg-black/10 rounded-md text-xs border-l-2 border-border/30'>
                              {' '}
                              {/* Angepasstes Styling */}
                              <h5 className='font-semibold mb-1.5 text-xs text-foreground/90'>
                                Punkteverteilung:
                              </h5>
                              <ul className='space-y-0.5'>
                                {event.awardedPoints.map((detail) => (
                                  <li
                                    key={detail.userId}
                                    className='flex justify-between text-muted-foreground'
                                  >
                                    <span>
                                      {' '}
                                      {detail.userName ||
                                        `User ${detail.userId}`}
                                      :{' '}
                                    </span>
                                    <span className='font-medium text-foreground/80'>
                                      {' '}
                                      {detail.points ?? 0} Pkt.{' '}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {/* ... (Restliche Logik für leeres Archiv bei Suche unverändert) ... */}
              {showArchived &&
                archivedClosedEvents.length === 0 &&
                searchTerm &&
                totalArchivedCount > 0 && (
                  <p className='text-muted-foreground text-sm px-2 py-4 italic mt-4 border-t pt-4 border-white/10 dark:border-white/5'>
                    {' '}
                    Keine archivierten Wetten entsprechen deiner Suche "
                    {searchTerm}".{' '}
                  </p>
                )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </TooltipProvider>
  );
}
