// src/components/dashboard/ClosedEventsCard.tsx
'use client';

import { useState } from 'react';
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
} from '@/components/ui/tooltip'; // Tooltip importieren
import {
  CheckCircle2,
  ChevronsUpDown,
  Archive,
  ArchiveRestore,
  Eye,
  EyeOff,
} from 'lucide-react'; // Icons
import { cn } from '@/lib/utils';

// ... (Props bleiben gleich)
type ClosedEventsCardProps = {
  events: GroupEvent[];
};

export function ClosedEventsCard({ events }: ClosedEventsCardProps) {
  const [isOpen, setIsOpen] = useState(true); // Standardmäßig offen
  const [archivedEventIds, setArchivedEventIds] = useState<Set<number>>(
    new Set()
  );
  const [showArchived, setShowArchived] = useState(false);

  // ... (handleToggleArchive bleibt gleich) ...
  const handleToggleArchive = (eventId: number) => {
    setArchivedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
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
    // Wrap with TooltipProvider if not done globally
    <TooltipProvider delayDuration={100}>
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        // Nur rendern, wenn es überhaupt abgeschlossene Events gibt? Optional.
        // className={cn(!hasAnyClosedEvents && "hidden")}
      >
        <Card className='shadow-sm border'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pr-4 py-3'>
            {' '}
            {/* Padding angepasst */}
            <CardTitle className='flex items-center gap-2 text-lg font-semibold'>
              {' '}
              {/* Schrift angepasst */}
              <CheckCircle2 className='w-5 h-5 text-green-600' />{' '}
              {/* Icon farbig */}
              Abgeschlossene Wetten
            </CardTitle>
            <div className='flex items-center gap-1'>
              {hasArchivedEvents && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='ghost'
                      size='icon' // Icon-Button für Konsistenz
                      className='h-8 w-8' // Kleine Größe
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
              {' '}
              {/* Padding angepasst */}
              {/* Verbesserter Empty State */}
              {!hasAnyClosedEvents && (
                <div className='text-center py-10 text-muted-foreground text-sm'>
                  <CheckCircle2 className='mx-auto h-10 w-10 opacity-50 mb-3' />
                  <p>Es gibt noch keine abgeschlossenen Wetten.</p>
                </div>
              )}
              {/* Aktive abgeschlossene Wetten */}
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
                  {' '}
                  {/* Trennlinien + Abstand */}
                  {activeClosedEvents.map((event) => (
                    <li
                      key={event.id}
                      className='flex items-start justify-between gap-3 pt-3 first:pt-0' // Abstand oben, außer erstes Element
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
                          className='text-xs font-normal' // Kleinere Badge
                        >
                          Gewinner: {event.winning_option}
                        </Badge>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-foreground' // Kleinerer Button
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
              {/* Archivierte geschlossene Wetten */}
              {hasArchivedEvents && showArchived && (
                <div className='mt-5 pt-4 border-t'>
                  <h4 className='text-sm font-medium text-muted-foreground mb-3'>
                    Archiv ({archivedClosedEvents.length})
                  </h4>
                  <ul className='space-y-3 divide-y divide-border/50'>
                    {' '}
                    {/* Trennlinien + Abstand */}
                    {archivedClosedEvents.map((event) => (
                      <li
                        key={event.id}
                        className={cn(
                          'flex items-start justify-between gap-3 pt-3 first:pt-0',
                          'opacity-70 hover:opacity-100 transition-opacity' // Style für Archiv
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
                            className='text-xs font-normal' // Kleinere Badge
                          >
                            Gewinner: {event.winning_option}
                          </Badge>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-foreground' // Kleinerer Button
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
