'use client';

import { useEffect, useState } from 'react';
import type { Event as GroupEvent } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  CheckCircle2,
  ChevronsUpDown,
  Archive,
  ArchiveRestore,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ClosedEventsCardProps = {
  events: GroupEvent[];
};

const STORAGE_KEY = 'archivedEventIds';

export function ClosedEventsCard({ events }: ClosedEventsCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [archivedEventIds, setArchivedEventIds] = useState<Set<number>>(
    new Set()
  );
  const [showArchived, setShowArchived] = useState(false);

  // Lade archivierte IDs aus dem LocalStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setArchivedEventIds(new Set(parsed));
        }
      } catch (e) {
        console.warn('Fehler beim Parsen von archivierten IDs:', e);
      }
    }
  }, []);

  // Speichere bei Änderungen
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Array.from(archivedEventIds))
    );
  }, [archivedEventIds]);

  const handleToggleArchive = (eventId: number) => {
    setArchivedEventIds((prev) => {
      const next = new Set(prev);
      next.has(eventId) ? next.delete(eventId) : next.add(eventId);
      return next;
    });
  };

  const allClosedEvents = Array.isArray(events)
    ? events.filter(
        (event): event is GroupEvent =>
          !!event &&
          typeof event.id === 'number' &&
          typeof event.winning_option === 'string'
      )
    : [];

  const activeClosedEvents = allClosedEvents.filter(
    (event) => !archivedEventIds.has(event.id)
  );
  const archivedClosedEvents = allClosedEvents.filter((event) =>
    archivedEventIds.has(event.id)
  );
  const hasArchivedEvents = archivedClosedEvents.length > 0;
  const hasAnyClosedEvents = allClosedEvents.length > 0;

  return (
    <TooltipProvider delayDuration={100}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className='shadow-sm border'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pr-4 py-3'>
            <CardTitle className='flex items-center gap-2 text-lg font-semibold'>
              <CheckCircle2 className='w-5 h-5 text-green-600' />
              Abgeschlossene Wetten
            </CardTitle>
            <div className='flex items-center gap-1'>
              {hasArchivedEvents && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8'
                      onClick={() => setShowArchived(!showArchived)}
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
                <Button variant='ghost' size='sm' className='w-9 p-0'>
                  <ChevronsUpDown className='h-4 w-4' />
                  <span className='sr-only'>Toggle</span>
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className='pt-2 pb-4 px-4 space-y-4'>
              {!hasAnyClosedEvents && (
                <div className='text-center py-10 text-muted-foreground text-sm'>
                  <CheckCircle2 className='mx-auto h-10 w-10 opacity-50 mb-3' />
                  <p>Es gibt noch keine abgeschlossenen Wetten.</p>
                </div>
              )}

              {activeClosedEvents.length === 0 &&
                hasArchivedEvents &&
                !showArchived && (
                  <p className='text-muted-foreground text-sm px-2 py-4 italic'>
                    Keine aktiven abgeschlossenen Wetten sichtbar.{' '}
                    {archivedClosedEvents.length} archiviert (
                    <Button
                      variant='link'
                      className='p-0 h-auto text-xs italic'
                      onClick={() => setShowArchived(true)}
                    >
                      anzeigen
                    </Button>
                    ).
                  </p>
                )}

              {activeClosedEvents.length > 0 && (
                <ul className='space-y-3 divide-y divide-border/50'>
                  {activeClosedEvents.map((event) => (
                    <li
                      key={event.id}
                      className='flex items-start justify-between gap-3 pt-3 first:pt-0'
                    >
                      <div className='space-y-1 flex-1'>
                        <div className='text-sm font-medium'>{event.title}</div>
                        {event.question && (
                          <div className='text-muted-foreground text-xs'>
                            {event.question}
                          </div>
                        )}
                        <Badge
                          variant='outline'
                          className='text-xs font-normal'
                        >
                          Gewinner: {event.winning_option}
                        </Badge>
                      </div>
                      <Tooltip>
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
                    </li>
                  ))}
                </ul>
              )}

              {hasArchivedEvents && showArchived && (
                <div className='mt-5 pt-4 border-t'>
                  <h4 className='text-sm font-medium text-muted-foreground mb-3'>
                    Archiv ({archivedClosedEvents.length})
                  </h4>
                  <ul className='space-y-3 divide-y divide-border/50'>
                    {archivedClosedEvents.map((event) => (
                      <li
                        key={event.id}
                        className={cn(
                          'flex items-start justify-between gap-3 pt-3 first:pt-0',
                          'opacity-70 hover:opacity-100 transition-opacity'
                        )}
                      >
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
                            Gewinner: {event.winning_option}
                          </Badge>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-foreground'
                              onClick={() => handleToggleArchive(event.id)}
                            >
                              <ArchiveRestore className='h-3.5 w-3.5' />
                              <span className='sr-only'>Wiederherstellen</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Wette wiederherstellen</p>
                          </TooltipContent>
                        </Tooltip>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </TooltipProvider>
  );
}
