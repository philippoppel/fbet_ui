// src/components/dashboard/ClosedEventsCard.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import type { Event as GroupEvent, EventPointDetail } from '@/app/lib/types'; // EventPointDetail importieren, falls noch nicht geschehen
// ... (Rest deiner Imports)
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  Users,
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
    // DEBUG LOG
    console.log(
      `[ClosedEventsCard] Toggle details for eventId: ${eventId}. Current expanded:`,
      Array.from(expandedEvents)
    );
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      console.log(`[ClosedEventsCard] New expanded set:`, Array.from(next)); // DEBUG LOG
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
    // DEBUG LOG für die ankommenden Events
    console.log(
      '[ClosedEventsCard] Raw events prop:',
      JSON.stringify(events, null, 2)
    );

    const baseAllClosedEvents = Array.isArray(events)
      ? events.filter(
          (event): event is GroupEvent =>
            !!event &&
            typeof event.id === 'number' &&
            typeof event.winningOption === 'string'
        )
      : [];

    // DEBUG LOG für baseAllClosedEvents
    console.log(
      '[ClosedEventsCard] baseAllClosedEvents (after initial filter):',
      JSON.stringify(
        baseAllClosedEvents.map((e) => ({
          id: e.id,
          title: e.title,
          awardedPoints: e.awardedPoints?.length,
        })),
        null,
        2
      )
    );

    const filteredBySearchTerm =
      searchTerm.trim() === ''
        ? baseAllClosedEvents
        : baseAllClosedEvents.filter((event) => {
            const lowerSearchTerm = searchTerm.toLowerCase();
            return (
              event.title?.toLowerCase().includes(lowerSearchTerm) ||
              event.description?.toLowerCase().includes(lowerSearchTerm) ||
              event.question?.toLowerCase().includes(lowerSearchTerm)
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

  // DEBUG LOG für den finalen State
  useEffect(() => {
    console.log(
      '[ClosedEventsCard] Current expandedEvents state:',
      Array.from(expandedEvents)
    );
  }, [expandedEvents]);

  return (
    <TooltipProvider delayDuration={100}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className='w-full'>
        <Card className='shadow-sm border'>
          <CardHeader className='py-3 px-4 space-y-2'>
            {/* ... (Header-Code unverändert, wie von dir zuletzt gepostet) ... */}
            <div className='flex flex-row items-center justify-between'>
              <CardTitle className='flex items-center gap-2 text-lg font-semibold'>
                <CheckCircle2 className='w-5 h-5 text-green-600' />
                Abgeschlossene Wetten
              </CardTitle>
              <div className='flex items-center gap-1'>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8'
                      onClick={() => setIsSearchVisible(!isSearchVisible)}
                      data-state={isSearchVisible ? 'on' : 'off'}
                    >
                      <Search className='h-4 w-4' />
                      <span className='sr-only'>
                        {isSearchVisible ? 'Suche ausblenden' : 'Suchen'}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
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
                        className='h-8 w-8 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground'
                        onClick={() => setShowArchived(!showArchived)}
                        data-state={showArchived ? 'on' : 'off'}
                      >
                        {showArchived ? (
                          <EyeOff className='h-4 w-4' />
                        ) : (
                          <Eye className='h-4 w-4' />
                        )}
                        <span className='sr-only'>
                          {showArchived
                            ? 'Archiv ausblenden'
                            : 'Archiv anzeigen'}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {showArchived ? 'Archiv ausblenden' : 'Archiv anzeigen'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
                <CollapsibleTrigger asChild>
                  <Button variant='ghost' size='sm' className='w-9 p-0'>
                    <ChevronsUpDown className='h-4 w-4' />
                    <span className='sr-only'>Toggle</span>
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
            {isSearchVisible && (
              <div className='relative pt-1'>
                <Input
                  type='text'
                  placeholder='Titel, Frage, Beschreibung durchsuchen...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='w-full pr-8 h-9 text-sm'
                />
                {searchTerm && (
                  <Button
                    variant='ghost'
                    size='icon'
                    className='absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-destructive'
                    onClick={() => setSearchTerm('')}
                    aria-label='Suche löschen'
                  >
                    <X className='h-4 w-4' />
                  </Button>
                )}
              </div>
            )}
          </CardHeader>

          <CollapsibleContent>
            <CardContent className='pt-2 pb-4 px-4 space-y-4'>
              {/* ... (Logik für leere Zustände unverändert) ... */}
              {!totalClosedEventCount && (
                <div className='text-center py-10 text-muted-foreground text-sm'>
                  <CheckCircle2 className='mx-auto h-10 w-10 opacity-50 mb-3' />
                  <p>Es gibt noch keine abgeschlossenen Wetten.</p>
                </div>
              )}
              {totalClosedEventCount > 0 &&
                !hasAnyClosedEventsToShow &&
                searchTerm && (
                  <div className='text-center py-10 text-muted-foreground text-sm'>
                    <Search className='mx-auto h-10 w-10 opacity-50 mb-3' />
                    <p>
                      Keine abgeschlossenen Wetten entsprechen deiner Suche "
                      {searchTerm}".
                    </p>
                  </div>
                )}
              {activeClosedEvents.length === 0 &&
                totalArchivedCount > 0 &&
                !showArchived &&
                !searchTerm &&
                hasAnyClosedEventsToShow && (
                  <p className='text-muted-foreground text-sm px-2 py-4 italic'>
                    Keine aktiven abgeschlossenen Wetten sichtbar.{' '}
                    {totalArchivedCount} archiviert (
                    <Button
                      variant='link'
                      className='p-0 h-auto text-xs italic'
                      onClick={() => {
                        setShowArchived(true);
                      }}
                    >
                      anzeigen
                    </Button>
                    ).
                  </p>
                )}

              {/* Aktive, nicht archivierte Events */}
              {activeClosedEvents.length > 0 && (
                <ul className='space-y-1'>
                  {activeClosedEvents.map((event) => {
                    // === MEHR DEBUG LOGGING PRO EVENT ===
                    if (event && event.id) {
                      // Nur loggen, wenn event und event.id existieren
                      console.log(
                        `[ClosedEventsCard] Rendering active event ID ${event.id}:`,
                        `awardedPoints exists: ${!!event.awardedPoints}`,
                        `awardedPoints length: ${event.awardedPoints?.length ?? 'N/A'}`,
                        `isExpanded: ${expandedEvents.has(event.id)}`
                      );
                      // console.log('Full active event object:', JSON.stringify(event, null, 2)); // Kann sehr lang sein
                    }
                    // === ENDE DEBUG LOGGING ===

                    return (
                      <li
                        key={event.id}
                        className='border-b py-3 last:border-b-0'
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
                              className='text-xs font-normal'
                            >
                              Gewinner: {event.winningOption}
                            </Badge>
                          </div>
                          <div className='flex items-center'>
                            {/* Bedingung für den Toggle-Button */}
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
                                        Punktedetails anzeigen
                                      </span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Punkteverteilung anzeigen</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            <Tooltip>
                              {' '}
                              {/* Archivieren Button */}
                              <TooltipTrigger asChild>
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  className='h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-foreground'
                                  onClick={() => handleToggleArchive(event.id)}
                                >
                                  <Archive className='h-3.5 w-3.5' />
                                  <span className='sr-only'>Archivieren</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Wette archivieren</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                        {/* Aufklappbare Punktedetails */}
                        {expandedEvents.has(event.id) &&
                          event.awardedPoints &&
                          event.awardedPoints.length > 0 && (
                            <div className='mt-2 pl-4 pr-2 py-2 bg-muted/30 rounded-md text-xs'>
                              <h5 className='font-semibold mb-1 text-xs'>
                                Punkteverteilung:
                              </h5>
                              <ul className='space-y-0.5'>
                                {event.awardedPoints.map((detail) => (
                                  <li
                                    key={detail.userId}
                                    className='flex justify-between'
                                  >
                                    <span>
                                      {detail.userName ||
                                        `User ${detail.userId}`}
                                      :
                                    </span>
                                    <span className='font-medium'>
                                      {detail.points ?? 0} Pkt.
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Archivierte Events (render ähnlich wie activeClosedEvents anpassen) */}
              {showArchived && archivedClosedEvents.length > 0 && (
                <div className='mt-5 pt-4 border-t'>
                  <h4 className='text-sm font-medium text-muted-foreground mb-3'>
                    Archiv ({archivedClosedEvents.length}
                    {searchTerm &&
                    archivedClosedEvents.length !== totalArchivedCount
                      ? ' gefiltert von ' + totalArchivedCount
                      : ''}
                    )
                  </h4>
                  <ul className='space-y-1 divide-y divide-border/50'>
                    {archivedClosedEvents.map((event) => {
                      // === MEHR DEBUG LOGGING PRO ARCHIVIERTEM EVENT ===
                      if (event && event.id) {
                        console.log(
                          `[ClosedEventsCard] Rendering archived event ID ${event.id}:`,
                          `awardedPoints exists: ${!!event.awardedPoints}`,
                          `awardedPoints length: ${event.awardedPoints?.length ?? 'N/A'}`,
                          `isExpanded: ${expandedEvents.has(event.id)}`
                        );
                      }
                      // === ENDE DEBUG LOGGING ===
                      return (
                        <li
                          key={event.id}
                          className={cn(
                            'border-b py-3 last:border-b-0 opacity-70 hover:opacity-100 transition-opacity'
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
                                className='text-xs font-normal'
                              >
                                Gewinner: {event.winningOption}
                              </Badge>
                            </div>
                            <div className='flex items-center'>
                              {/* Bedingung für den Toggle-Button */}
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
                                          Punktedetails anzeigen
                                        </span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Punkteverteilung anzeigen</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              <Tooltip>
                                {' '}
                                {/* Wiederherstellen Button */}
                                <TooltipTrigger asChild>
                                  <Button
                                    variant='ghost'
                                    size='icon'
                                    className='h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-foreground'
                                    onClick={() =>
                                      handleToggleArchive(event.id)
                                    }
                                  >
                                    <ArchiveRestore className='h-3.5 w-3.5' />
                                    <span className='sr-only'>
                                      Wiederherstellen
                                    </span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Wette wiederherstellen</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                          {/* Aufklappbare Punktedetails */}
                          {expandedEvents.has(event.id) &&
                            event.awardedPoints &&
                            event.awardedPoints.length > 0 && (
                              <div className='mt-2 pl-4 pr-2 py-2 bg-muted/30 rounded-md text-xs'>
                                <h5 className='font-semibold mb-1 text-xs'>
                                  Punkteverteilung:
                                </h5>
                                <ul className='space-y-0.5'>
                                  {event.awardedPoints.map((detail) => (
                                    <li
                                      key={detail.userId}
                                      className='flex justify-between'
                                    >
                                      <span>
                                        {detail.userName ||
                                          `User ${detail.userId}`}
                                        :
                                      </span>
                                      <span className='font-medium'>
                                        {detail.points ?? 0} Pkt.
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {/* ... (Restliche Logik für leeres Archiv bei Suche unverändert) ... */}
              {showArchived &&
                archivedClosedEvents.length === 0 &&
                searchTerm &&
                totalArchivedCount > 0 && (
                  <p className='text-muted-foreground text-sm px-2 py-4 italic mt-4 border-t pt-4'>
                    Keine archivierten Wetten entsprechen deiner Suche "
                    {searchTerm}".
                  </p>
                )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </TooltipProvider>
  );
}
