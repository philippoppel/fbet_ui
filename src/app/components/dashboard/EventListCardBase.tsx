// src/components/dashboard/EventListCardBase.tsx
'use client';

import { useState, useMemo, type ReactNode } from 'react';
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
import { ChevronsUpDown, Search, X } from 'lucide-react';
import type { Event as GroupEvent } from '@/app/lib/types'; // Dein Event-Typ

interface EventListCardBaseProps {
  title: string;
  icon?: ReactNode; // Optional: Icon für den Titel
  events: GroupEvent[]; // Die ungefilterte Liste der Events für diese Karte
  defaultOpen?: boolean; // Ob die Karte initial geöffnet ist
  defaultSearchVisible?: boolean; // Ob die Suche initial sichtbar ist
  searchPlaceholder?: string;
  headerActions?: ReactNode; // Zusätzliche Aktionen im Header (z.B. Archiv-Toggle)
  renderEventList: (filteredEvents: GroupEvent[]) => ReactNode; // Funktion, die die gefilterte Event-Liste rendert
  emptyStateMessage?: string; // Nachricht, wenn gar keine Events (nach initialem Filter) da sind
  noSearchResultsMessage?: (searchTerm: string) => string; // Nachricht, wenn Suche nichts ergibt
}

export function EventListCardBase({
  title,
  icon,
  events,
  defaultOpen = true,
  defaultSearchVisible = false,
  searchPlaceholder = 'Events durchsuchen...',
  headerActions,
  renderEventList,
  emptyStateMessage = 'Keine Events vorhanden.',
  noSearchResultsMessage = (term) => `Keine Events für "${term}" gefunden.`,
}: EventListCardBaseProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(defaultSearchVisible);

  const filteredEvents = useMemo(() => {
    if (!Array.isArray(events)) return [];
    if (searchTerm.trim() === '') {
      return events;
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    return events.filter((event) => {
      return (
        event.title?.toLowerCase().includes(lowerSearchTerm) ||
        event.description?.toLowerCase().includes(lowerSearchTerm) ||
        event.question?.toLowerCase().includes(lowerSearchTerm)
      );
    });
  }, [events, searchTerm]);

  return (
    <TooltipProvider delayDuration={100}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className='w-full'>
        <Card className='shadow-sm border'>
          <CardHeader className='py-3 px-4 space-y-2'>
            <div className='flex flex-row items-center justify-between'>
              <CardTitle className='flex items-center gap-2 text-lg font-semibold'>
                {icon}
                {title}
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
                        : 'Events durchsuchen'}
                    </p>
                  </TooltipContent>
                </Tooltip>
                {headerActions}
                {/* Platz für spezifische Aktionen wie Archiv-Toggle */}
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
                  placeholder={searchPlaceholder}
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
              {filteredEvents.length > 0 ? (
                renderEventList(filteredEvents)
              ) : searchTerm ? (
                <div className='text-center py-10 text-muted-foreground text-sm'>
                  <Search className='mx-auto h-10 w-10 opacity-50 mb-3' />
                  <p>{noSearchResultsMessage(searchTerm)}</p>
                </div>
              ) : (
                <div className='text-center py-10 text-muted-foreground text-sm'>
                  {/* Hier könnte ein spezifischeres Icon für "Keine Events" verwendet werden,
                      aber das generische Icon der Basiskomponente ist auch okay. */}
                  {icon && (
                    <span className='mx-auto h-10 w-10 opacity-50 mb-3 flex items-center justify-center'>
                      {icon}
                    </span>
                  )}
                  <p>{emptyStateMessage}</p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </TooltipProvider>
  );
}
