// src/components/dashboard/OpenEventsCard.tsx
'use client';

import { useState } from 'react';
import type { Event as GroupEvent, UserOut } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Loader2, ListChecks, Edit, ChevronsUpDown } from 'lucide-react'; // Icons
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// ... (Props bleiben gleich)
type OpenEventsCardProps = {
  events: GroupEvent[];
  user: UserOut;
  groupCreatedBy: number;
  selectedTips: Record<number, string>;
  resultInputs: Record<number, string>;
  isSubmittingTip: Record<number, boolean>;
  isSettingResult: Record<number, boolean>;
  onSelectTip: (eventId: number, option: string) => void;
  onSubmitTip: (eventId: number) => void;
  onResultInputChange: (eventId: number, value: string) => void;
  onSetResult: (eventId: number, options: string[]) => void;
};

export function OpenEventsCard({
  events,
  user,
  groupCreatedBy,
  selectedTips,
  resultInputs,
  isSubmittingTip,
  isSettingResult,
  onSelectTip,
  onSubmitTip,
  onResultInputChange,
  onSetResult,
}: OpenEventsCardProps) {
  const isAdmin = user.id === groupCreatedBy;

  const openEvents = Array.isArray(events)
    ? events.filter(
        (event): event is GroupEvent =>
          !!event &&
          typeof event.id === 'number' &&
          (event.winning_option === null || event.winning_option === undefined)
      )
    : [];

  const [isOpen, setIsOpen] = useState(true); // Standardmäßig offen

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className='shadow-sm border'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pr-4 py-3'>
          {' '}
          {/* Padding angepasst */}
          <CardTitle className='flex items-center gap-2 text-lg font-semibold'>
            {' '}
            {/* Schrift angepasst */}
            <ListChecks className='w-5 h-5 text-primary' /> {/* Icon farbig */}
            Offene Wetten
          </CardTitle>
          <CollapsibleTrigger asChild>
            <Button variant='ghost' size='sm' className='w-9 p-0'>
              <ChevronsUpDown className='h-4 w-4' />
              <span className='sr-only'>Toggle</span>
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className='pt-2 pb-4 px-4'>
            {' '}
            {/* Padding angepasst */}
            {/* Verbesserter Empty State */}
            {openEvents.length === 0 ? (
              <div className='text-center py-10 text-muted-foreground text-sm'>
                <ListChecks className='mx-auto h-10 w-10 opacity-50 mb-3' />
                <p>Aktuell sind keine Wetten offen.</p>
                {/* Optional: CTA wenn Admin */}
                {isAdmin && (
                  <p className='mt-1'>
                    Du kannst im Gruppen-Header ein neues Event erstellen.
                  </p>
                )}
              </div>
            ) : (
              <ul className='space-y-5'>
                {' '}
                {/* Mehr Abstand zwischen Events */}
                {openEvents.map((event) => {
                  // ... (Mapping Logik bleibt gleich) ...
                  if (
                    !event ||
                    typeof event.id !== 'number' ||
                    !Array.isArray(event.options)
                  ) {
                    console.warn('Überspringe ungültiges Event:', event);
                    return null;
                  }
                  const tipSubmitting = isSubmittingTip[event.id] ?? false;
                  const resultSetting = isSettingResult[event.id] ?? false;

                  return (
                    <li
                      key={event.id}
                      // Leichter Hintergrund/Border zur Abgrenzung
                      className='rounded-lg border bg-card p-4 space-y-4 shadow-sm'
                    >
                      {/* Event Info - Mehr Hierarchie */}
                      <div>
                        <h3 className='font-semibold text-base'>
                          {event.title ?? 'Unbenanntes Event'}
                        </h3>
                        {event.description && (
                          <p className='text-muted-foreground text-sm mt-0.5'>
                            {event.description}
                          </p>
                        )}
                        <p className='text-sm font-medium text-foreground/90 mt-1.5'>
                          {event.question ?? 'Keine Frage'}
                        </p>
                      </div>

                      {/* Tipp-Bereich - Visuell gruppiert */}
                      <div className='bg-muted/50 rounded-md p-3 space-y-3'>
                        <div className='flex flex-wrap items-center gap-2 sm:gap-3'>
                          <span className='text-sm font-medium text-muted-foreground mr-2'>
                            Dein Tipp:
                          </span>
                          {event.options.map((option) => {
                            const isSelected =
                              selectedTips[event.id] === option;
                            return (
                              <Button
                                key={option}
                                size='sm'
                                variant={isSelected ? 'default' : 'outline'}
                                className={cn(
                                  'transition-all text-xs sm:text-sm', // Kleinere Schrift auf xs?
                                  isSelected
                                    ? 'ring-2 ring-primary ring-offset-background ring-offset-1 hover:bg-primary/90' // Ring angepasst
                                    : 'hover:border-primary hover:text-primary'
                                )}
                                onClick={() => onSelectTip(event.id, option)}
                                disabled={tipSubmitting}
                              >
                                {option}
                              </Button>
                            );
                          })}
                        </div>
                        {/* Tipp abgeben Button rechts */}
                        <div className='flex justify-end pt-1'>
                          <Button
                            size='sm'
                            variant='secondary'
                            onClick={() => onSubmitTip(event.id)}
                            disabled={!selectedTips[event.id] || tipSubmitting}
                            className='hover:bg-secondary/90'
                          >
                            {tipSubmitting && (
                              <Loader2 className='h-4 w-4 animate-spin mr-2' />
                            )}
                            {tipSubmitting ? 'Sende...' : 'Tipp abgeben'}
                          </Button>
                        </div>
                      </div>

                      {/* Admin Bereich */}
                      {isAdmin && (
                        <div className='pt-3 border-t border-border/50 mt-4'>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant='outline' // Weniger prominent als Tipp abgeben
                                size='sm'
                                disabled={resultSetting}
                                className='gap-1.5 text-muted-foreground hover:text-foreground hover:border-foreground/50'
                              >
                                <Edit className='w-3.5 h-3.5' />
                                {resultSetting
                                  ? 'Speichere...'
                                  : 'Ergebnis eintragen'}
                              </Button>
                            </DialogTrigger>
                            {/* Dialog Content bleibt gleich */}
                            <DialogContent className='sm:max-w-[425px]'>
                              {/* ... */}
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
