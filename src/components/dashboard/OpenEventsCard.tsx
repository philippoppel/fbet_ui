'use client';

import { useState } from 'react';
import type { Event as GroupEvent, UserOut } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import {
  Loader2,
  ListChecks,
  Edit,
  ChevronsUpDown,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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

  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className='shadow-sm border'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pr-4 py-3'>
          <CardTitle className='flex items-center gap-2 text-lg font-semibold'>
            <ListChecks className='w-5 h-5 text-primary' />
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
            {openEvents.length === 0 ? (
              <div className='text-center py-10 text-muted-foreground text-sm'>
                <ListChecks className='mx-auto h-10 w-10 opacity-50 mb-3' />
                <p>Aktuell sind keine Wetten offen.</p>
                {isAdmin && (
                  <p className='mt-1'>
                    Du kannst im Gruppen-Header ein neues Event erstellen.
                  </p>
                )}
              </div>
            ) : (
              <ul className='space-y-5'>
                {openEvents.map((event) => {
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
                  const userTip = selectedTips[event.id];

                  return (
                    <li
                      key={event.id}
                      className='rounded-lg border bg-card p-4 space-y-4 shadow-sm'
                    >
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

                      {/* Tipp-Bereich */}
                      <div className='bg-muted/50 rounded-md p-3 space-y-3'>
                        <div className='flex flex-wrap items-center gap-2 sm:gap-3'>
                          <span className='text-sm font-medium text-muted-foreground mr-2'>
                            Dein Tipp:
                          </span>
                          {event.options.map((option) => {
                            const isSelected = userTip === option;
                            return (
                              <Button
                                key={option}
                                size='sm'
                                variant={isSelected ? 'default' : 'outline'}
                                className={cn(
                                  'transition-all text-xs sm:text-sm',
                                  isSelected
                                    ? 'ring-2 ring-primary ring-offset-background ring-offset-1 hover:bg-primary/90'
                                    : 'hover:border-primary hover:text-primary'
                                )}
                                onClick={() => onSelectTip(event.id, option)}
                                disabled={!!userTip || tipSubmitting}
                              >
                                {option}
                              </Button>
                            );
                          })}
                        </div>

                        <div className='flex justify-end pt-1'>
                          {userTip && !tipSubmitting ? (
                            <div className='flex items-center gap-1 text-sm text-green-600 font-medium'>
                              <CheckCircle className='w-4 h-4' />
                              Tipp abgegeben: {userTip}
                            </div>
                          ) : (
                            <Button
                              size='sm'
                              variant='secondary'
                              onClick={() => onSubmitTip(event.id)}
                              disabled={!userTip || tipSubmitting}
                              className='hover:bg-secondary/90'
                            >
                              {tipSubmitting && (
                                <Loader2 className='h-4 w-4 animate-spin mr-2' />
                              )}
                              {tipSubmitting ? 'Sende...' : 'Tipp abgeben'}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Admin Bereich */}
                      {isAdmin && (
                        <div className='pt-3 border-t border-border/50 mt-4'>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant='outline'
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
                            <DialogContent className='sm:max-w-[425px]'>
                              {/* Admin-Dialog-Inhalt kommt hier rein */}
                              <div className='space-y-4'>
                                <h3 className='font-semibold'>
                                  Ergebnis für: {event.title}
                                </h3>
                                <div className='space-y-2'>
                                  {event.options.map((option) => (
                                    <Button
                                      key={option}
                                      variant={
                                        resultInputs[event.id] === option
                                          ? 'default'
                                          : 'outline'
                                      }
                                      size='sm'
                                      className='w-full justify-start'
                                      onClick={() =>
                                        onResultInputChange(event.id, option)
                                      }
                                    >
                                      {option}
                                    </Button>
                                  ))}
                                </div>
                                <Button
                                  onClick={() =>
                                    onSetResult(event.id, event.options)
                                  }
                                  disabled={
                                    !resultInputs[event.id] || resultSetting
                                  }
                                >
                                  {resultSetting ? (
                                    <>
                                      <Loader2 className='h-4 w-4 animate-spin mr-2' />
                                      Speichere...
                                    </>
                                  ) : (
                                    'Ergebnis speichern'
                                  )}
                                </Button>
                              </div>
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
