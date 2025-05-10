// src/components/dashboard/ClosedEventsCard.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import type { Event as GroupEvent, EventPointDetail } from '@/app/lib/types';
import {
  Card,
  CardContent, // Wieder eingeführt für konsistentes Padding
  CardHeader, // Wieder eingeführt
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
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';

type ClosedEventsCardProps = {
  events: GroupEvent[];
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
          )
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
              event.winningOption?.toLowerCase().includes(lowerSearchTerm)
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

  // Hilfsfunktion zum Rendern der Event-Liste
  const renderEventItem = (event: GroupEvent, isArchived: boolean) => (
    <div
      key={event.id}
      className={cn(
        'rounded-xl bg-card border border-border p-4 sm:p-5 shadow-sm transition-colors', // Angelehnt an SingleOpenEventItem
        isArchived && 'opacity-70 hover:opacity-100'
      )}
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='space-y-1 flex-1'>
          <h4 className='text-base font-semibold text-foreground leading-tight'>
            {event.title}
          </h4>
          {event.question && (
            <p className='text-sm text-muted-foreground'>{event.question}</p>
          )}
          <Badge
            variant={isArchived ? 'outline' : 'default'} // Unterschiedliche Badge für Archiv
            className={cn(
              'text-xs font-normal mt-1',
              isArchived
                ? 'border-border/50'
                : 'border-primary/30 text-primary-foreground bg-primary/90' // Primäre Farbe für aktive
            )}
          >
            Gewinner: {event.winningOption}
          </Badge>
        </div>
        <div className='flex items-center flex-shrink-0 gap-1'>
          {event.awardedPoints && event.awardedPoints.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 text-muted-foreground hover:text-primary'
                  onClick={() => toggleEventPointDetails(event.id)}
                >
                  {expandedEvents.has(event.id) ? (
                    <ChevronDown className='h-4 w-4' />
                  ) : (
                    <ChevronRight className='h-4 w-4' />
                  )}
                  <span className='sr-only'>Punktedetails</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Punkteverteilung</p>
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8 text-muted-foreground hover:text-foreground'
                onClick={() => handleToggleArchive(event.id)}
              >
                {isArchived ? (
                  <ArchiveRestore className='h-4 w-4' />
                ) : (
                  <Archive className='h-4 w-4' />
                )}
                <span className='sr-only'>
                  {isArchived ? 'Wiederherstellen' : 'Archivieren'}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isArchived ? 'Wiederherstellen' : 'Wette archivieren'}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {expandedEvents.has(event.id) &&
        event.awardedPoints &&
        event.awardedPoints.length > 0 && (
          <div className='mt-3 ml-1 pl-3 py-2 bg-muted/50 dark:bg-black/20 rounded-md text-sm border-l-2 border-primary/50'>
            <h5 className='font-semibold mb-1.5 text-xs text-foreground/90 uppercase tracking-wide'>
              Punkteverteilung:
            </h5>
            <ul className='space-y-1 text-xs'>
              {event.awardedPoints.map((detail) => (
                <li
                  key={detail.userId}
                  className='flex justify-between text-muted-foreground'
                >
                  <span>{detail.userName || `User ${detail.userId}`}:</span>
                  <span className='font-medium text-foreground/80'>
                    {detail.points ?? 0} Pkt.
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
    </div>
  );

  return (
    <TooltipProvider delayDuration={100}>
      <Card className='bg-muted/30 border border-border rounded-xl shadow-sm'>
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className='w-full'>
          <CardHeader className='flex flex-row items-center justify-between gap-2 pb-3 pr-3 sm:pr-4'>
            <div className='flex items-center gap-2'>
              <CheckCircle2 className='h-5 w-5 text-green-500 dark:text-green-400' />
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
                    className='h-8 w-8 text-muted-foreground hover:text-foreground data-[state=on]:bg-accent data-[state=on]:text-accent-foreground'
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
                      className='h-8 w-8 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground text-muted-foreground hover:text-foreground'
                      onClick={() => setShowArchived(!showArchived)}
                      data-state={showArchived ? 'on' : 'off'}
                    >
                      {showArchived ? (
                        <EyeOff className='h-4 w-4' />
                      ) : (
                        <Eye className='h-4 w-4' />
                      )}
                      <span className='sr-only'>
                        {showArchived ? 'Archiv ausblenden' : 'Archiv anzeigen'}
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
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 text-muted-foreground hover:text-foreground'
                >
                  <ChevronsUpDown className='h-4 w-4' />
                  <span className='sr-only'>Toggle</span>
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>

          {isSearchVisible && (
            <div className='px-4 sm:px-6 pb-3'>
              <div className='relative'>
                <Input
                  type='text'
                  placeholder='Titel, Frage, Gewinner durchsuchen...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='w-full pr-10 h-9 text-sm bg-background/70 dark:bg-black/30 border-border/70 focus:border-primary/70 focus:ring-primary/30 rounded-md'
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
            </div>
          )}

          <CollapsibleContent>
            <CardContent className='space-y-6 pt-2 pb-4'>
              {!totalClosedEventCount && (
                <div className='py-8 text-center text-sm text-muted-foreground'>
                  <div className='flex flex-col items-center gap-4'>
                    <CheckCircle2 className='mx-auto h-12 w-12 opacity-30 mb-2' />
                    <p className='text-xs sm:text-sm'>
                      Es gibt noch keine abgeschlossenen Wetten.
                    </p>
                  </div>
                </div>
              )}

              {totalClosedEventCount > 0 &&
                !hasAnyClosedEventsToShow &&
                searchTerm && (
                  <div className='py-8 text-center text-sm text-muted-foreground'>
                    <div className='flex flex-col items-center gap-4'>
                      <Search className='mx-auto h-12 w-12 opacity-30 mb-2' />
                      <p className='text-xs sm:text-sm'>
                        Keine abgeschlossenen Wetten entsprechen deiner Suche
                        &#34;
                        {searchTerm}&#34;.
                      </p>
                    </div>
                  </div>
                )}

              {activeClosedEvents.length === 0 &&
                totalArchivedCount > 0 &&
                !showArchived &&
                !searchTerm &&
                totalClosedEventCount > 0 && ( // Sicherstellen, dass es überhaupt Events gibt
                  <p className='text-muted-foreground text-sm text-center italic py-6'>
                    Alle abgeschlossenen Wetten sind archiviert.
                    <Button
                      variant='link'
                      className='p-0 h-auto text-xs italic ml-1'
                      onClick={() => {
                        setShowArchived(true);
                      }}
                    >
                      Archiv anzeigen ({totalArchivedCount})
                    </Button>
                  </p>
                )}

              {activeClosedEvents.length > 0 && (
                <div className='space-y-4'>
                  {' '}
                  {/* Container für aktive Events */}
                  {activeClosedEvents.map((event) =>
                    renderEventItem(event, false)
                  )}
                </div>
              )}

              {showArchived && archivedClosedEvents.length > 0 && (
                <div className='mt-6 pt-6 border-t border-border/70'>
                  <h3 className='text-sm font-semibold text-muted-foreground mb-4 px-1'>
                    Archiv ({archivedClosedEvents.length}
                    {searchTerm &&
                    archivedClosedEvents.length !== totalArchivedCount
                      ? ` von ${totalArchivedCount} passend zum Filter`
                      : ''}
                    )
                  </h3>
                  <div className='space-y-4'>
                    {' '}
                    {/* Container für archivierte Events */}
                    {archivedClosedEvents.map((event) =>
                      renderEventItem(event, true)
                    )}
                  </div>
                </div>
              )}
              {showArchived &&
                archivedClosedEvents.length === 0 &&
                searchTerm &&
                totalArchivedCount > 0 && (
                  <p className='text-muted-foreground text-sm italic text-center py-6 mt-4 border-t border-border/70'>
                    Keine archivierten Wetten entsprechen deiner Suche &#34;
                    {searchTerm}&#34;.
                  </p>
                )}
              {showArchived &&
                archivedClosedEvents.length === 0 &&
                !searchTerm &&
                totalArchivedCount > 0 && (
                  <p className='text-muted-foreground text-sm italic text-center py-6 mt-4 border-t border-border/70'>
                    Das Archiv ist leer oder alle archivierten Events wurden
                    durch Filter ausgeblendet.
                  </p>
                )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </TooltipProvider>
  );
}
