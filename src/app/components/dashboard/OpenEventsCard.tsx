// src/components/dashboard/OpenEventsCard.tsx
'use client';

import { useState, useMemo } from 'react';
import type { Event as GroupEvent, UserOut } from '@/app/lib/types';
import { Button } from '@/app/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
  DialogHeader as ShadDialogHeader,
  DialogFooter,
  DialogTitle as ShadDialogTitle,
} from '@/app/components/ui/dialog';
import {
  Loader2,
  ListChecks,
  Edit,
  ChevronsUpDown,
  CheckCircle,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/app/components/ui/collapsible';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/app/components/ui/tooltip';

type OpenEventsCardProps = {
  events: GroupEvent[];
  user: UserOut;
  groupCreatedBy: number;
  selectedTips: Record<number, string>; // Lokale UI-Auswahl
  userSubmittedTips: Record<number, string>; // Gespeicherte Tipps
  resultInputs: Record<number, string>;
  isSubmittingTip: Record<number, boolean>;
  isSettingResult: Record<number, boolean>;
  onSelectTip: (eventId: number, option: string) => void;
  onSubmitTip: (eventId: number) => void;
  onResultInputChange: (eventId: number, value: string) => void;
  onSetResult: (eventId: number, winningOption: string) => void;
  onClearSelectedTip: (eventId: number) => void;
};

export function OpenEventsCard({
  events,
  user,
  groupCreatedBy,
  selectedTips,
  userSubmittedTips,
  resultInputs,
  isSubmittingTip,
  isSettingResult,
  onSelectTip,
  onSubmitTip,
  onResultInputChange,
  onSetResult,
  onClearSelectedTip,
}: OpenEventsCardProps) {
  const isAdmin = user.id === groupCreatedBy;

  // Filtere offene Events
  const openEvents = useMemo(
    () =>
      Array.isArray(events)
        ? events.filter(
            (event): event is GroupEvent =>
              !!event &&
              typeof event.id === 'number' &&
              (event.winningOption === null ||
                event.winningOption === undefined)
          )
        : [],
    [events] // Abhängigkeit von events
  );

  const [isOpen, setIsOpen] = useState(true); // State für Collapsible
  const [adminSelectedOption, setAdminSelectedOption] = useState<
    Record<number, string>
  >({}); // State für Admin-Dialog

  const handleAdminOptionSelect = (eventId: number, option: string) => {
    setAdminSelectedOption((prev) => ({ ...prev, [eventId]: option }));
    onResultInputChange(eventId, option); // Rufe auch den Handler vom Hook auf
  };

  return (
    <TooltipProvider>
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
                    // Sicherheitscheck für Event-Struktur
                    if (
                      !event ||
                      typeof event.id !== 'number' ||
                      !Array.isArray(event.options) ||
                      !event.options.every((opt) => typeof opt === 'string')
                    ) {
                      console.warn(
                        'OpenEventsCard: Überspringe ungültiges Event:',
                        event
                      );
                      return null;
                    }

                    const tipIsBeingSubmitted =
                      isSubmittingTip[event.id] ?? false;
                    const resultIsBeingSet = isSettingResult[event.id] ?? false;

                    const currentUISelection = selectedTips[event.id]; // Aktuelle UI-Auswahl
                    const persistedTip = userSubmittedTips[event.id]; // Gespeicherter Tipp

                    // Button-Logik
                    let tipButtonText = 'Tipp abgeben';
                    if (
                      persistedTip &&
                      currentUISelection &&
                      currentUISelection !== persistedTip
                    ) {
                      tipButtonText = 'Tipp ändern';
                    } else if (persistedTip && !currentUISelection) {
                      tipButtonText = 'Tipp ändern'; // Ermöglicht erneute Auswahl
                    }
                    if (tipIsBeingSubmitted) {
                      tipButtonText = 'Sende...';
                    }

                    const isSubmitButtonDisabled =
                      tipIsBeingSubmitted || // Deaktiviert während Senden
                      !currentUISelection || // Deaktiviert, wenn nichts im UI ausgewählt
                      currentUISelection === persistedTip; // Deaktiviert, wenn Auswahl = gespeicherter Tipp

                    return (
                      <li
                        key={event.id}
                        className='rounded-lg border bg-card p-4 space-y-4 shadow-sm'
                      >
                        {/* Event Details */}
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
                          {/* Optionen-Buttons */}
                          <div className='flex flex-wrap items-center gap-2 sm:gap-3'>
                            <span className='text-sm font-medium text-muted-foreground mr-2'>
                              {persistedTip
                                ? 'Dein Tipp:'
                                : 'Wähle deinen Tipp:'}
                            </span>
                            {(event.options as string[]).map(
                              (option: string) => {
                                const isSelectedInUI =
                                  currentUISelection === option;
                                const showAsPersisted =
                                  !currentUISelection &&
                                  persistedTip === option;
                                return (
                                  <Button
                                    key={option}
                                    size='sm'
                                    variant={
                                      isSelectedInUI
                                        ? 'default'
                                        : showAsPersisted
                                          ? 'secondary'
                                          : 'outline'
                                    }
                                    className={cn(
                                      'transition-all text-xs sm:text-sm',
                                      isSelectedInUI &&
                                        'ring-2 ring-primary ring-offset-background ring-offset-1',
                                      showAsPersisted &&
                                        'border-dashed border-primary/70 opacity-90 font-semibold'
                                    )}
                                    onClick={() =>
                                      onSelectTip(event.id, option)
                                    }
                                    disabled={tipIsBeingSubmitted}
                                  >
                                    {option}
                                  </Button>
                                );
                              }
                            )}
                          </div>

                          {/* Status und Aktions-Buttons */}
                          <div className='flex justify-between items-center pt-1 min-h-[2.25rem]'>
                            <div className='flex-1'>
                              {/* Anzeige des gespeicherten Tipps */}
                              {persistedTip &&
                                !currentUISelection &&
                                !tipIsBeingSubmitted && (
                                  <div className='flex items-center gap-1 text-sm text-green-600 font-medium'>
                                    <CheckCircle className='w-4 h-4' />
                                    Getippt: {persistedTip}
                                  </div>
                                )}
                            </div>
                            <div className='flex items-center gap-2'>
                              {/* Button "Auswahl verwerfen" */}
                              {currentUISelection &&
                                persistedTip &&
                                currentUISelection !== persistedTip && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size='sm'
                                        variant='ghost'
                                        className='text-muted-foreground hover:text-destructive px-2'
                                        onClick={() =>
                                          onClearSelectedTip(event.id)
                                        }
                                        disabled={tipIsBeingSubmitted}
                                        title='Auswahl verwerfen'
                                      >
                                        <RotateCcw className='h-3.5 w-3.5' />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Auswahl verwerfen</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              {/* Button "Tipp abgeben/ändern" */}
                              {/* Zeige den Button immer an, wenn Optionen da sind, Logik für disabled regelt den Rest */}
                              <Button
                                size='sm'
                                variant='default'
                                onClick={() => onSubmitTip(event.id)}
                                disabled={isSubmitButtonDisabled}
                                className='hover:bg-primary/90'
                              >
                                {tipIsBeingSubmitted && (
                                  <Loader2 className='h-4 w-4 animate-spin mr-2' />
                                )}
                                {tipButtonText}
                              </Button>
                            </div>
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
                                  disabled={resultIsBeingSet}
                                  className='gap-1.5 text-muted-foreground hover:text-foreground hover:border-foreground/50'
                                >
                                  <Edit className='w-3.5 h-3.5' />
                                  {resultIsBeingSet
                                    ? 'Speichere...'
                                    : 'Ergebnis eintragen'}
                                </Button>
                              </DialogTrigger>
                              <DialogContent className='sm:max-w-[425px]'>
                                <ShadDialogHeader>
                                  <ShadDialogTitle>
                                    Ergebnis für: {event.title}
                                  </ShadDialogTitle>
                                </ShadDialogHeader>
                                <div className='space-y-4 py-2'>
                                  <p className='text-sm text-muted-foreground'>
                                    Wähle die gewinnende Option:
                                  </p>
                                  <div className='space-y-2'>
                                    {(event.options as string[]).map(
                                      (option) => (
                                        <Button
                                          key={option}
                                          variant={
                                            adminSelectedOption[event.id] ===
                                            option
                                              ? 'default'
                                              : 'outline'
                                          }
                                          size='sm'
                                          className='w-full justify-start'
                                          onClick={() =>
                                            handleAdminOptionSelect(
                                              event.id,
                                              option
                                            )
                                          }
                                        >
                                          {option}
                                        </Button>
                                      )
                                    )}
                                  </div>
                                  <DialogFooter className='pt-4'>
                                    <DialogClose asChild>
                                      <Button type='button' variant='ghost'>
                                        Abbrechen
                                      </Button>
                                    </DialogClose>
                                    <Button
                                      onClick={() => {
                                        const winningOpt =
                                          adminSelectedOption[event.id];
                                        if (winningOpt) {
                                          onSetResult(event.id, winningOpt);
                                        }
                                      }}
                                      disabled={
                                        !adminSelectedOption[event.id] ||
                                        resultIsBeingSet
                                      }
                                    >
                                      {resultIsBeingSet ? (
                                        <>
                                          <Loader2 className='h-4 w-4 animate-spin mr-2' />{' '}
                                          Speichere...
                                        </>
                                      ) : (
                                        'Ergebnis speichern'
                                      )}
                                    </Button>
                                  </DialogFooter>
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
    </TooltipProvider>
  );
}
