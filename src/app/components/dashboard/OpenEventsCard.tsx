// src/app/components/dashboard/OpenEventsCard.tsx
'use client';

import { useState, useMemo } from 'react';
import type { Event as GroupEvent, UserOut } from '@/app/lib/types';
import { Button } from '@/app/components/ui/button';
import {
  Card, // Card wird weiter als Struktur verwendet, aber mit angepassten Styles
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
  groupCreatedBy: number; // Wird verwendet, um isAdmin zu bestimmen
  selectedTips: Record<number, string>;
  userSubmittedTips: Record<number, string>;
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

  const openEvents = useMemo(
    () =>
      Array.isArray(events)
        ? events
            .filter(
              (event): event is GroupEvent =>
                !!event &&
                typeof event.id === 'number' &&
                (event.winningOption === null ||
                  event.winningOption === undefined)
            )
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            ) // Neueste zuerst anzeigen
        : [],
    [events]
  );

  const [isOpen, setIsOpen] = useState(true);
  const [adminSelectedOption, setAdminSelectedOption] = useState<
    Record<number, string>
  >({});

  const handleAdminOptionSelect = (eventId: number, option: string) => {
    setAdminSelectedOption((prev) => ({ ...prev, [eventId]: option }));
    onResultInputChange(eventId, option);
  };

  return (
    <TooltipProvider>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Angepasste Haupt-Card */}
        <Card
          className={cn(
            'shadow-md overflow-hidden',
            'bg-background/60 dark:bg-slate-900/50 backdrop-blur-lg supports-[backdrop-filter]:bg-background/70', // Semi-transparent mit Blur
            'border border-white/10 dark:border-white/5 rounded-lg' // Angepasster Rand
          )}
        >
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pr-4 py-3 border-b border-white/10 dark:border-white/5'>
            <CardTitle className='flex items-center gap-2 text-lg font-semibold text-foreground'>
              <ListChecks className='w-5 h-5 text-primary' />
              Offene Wetten
            </CardTitle>
            <CollapsibleTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                className='w-9 p-0 text-muted-foreground hover:text-foreground'
              >
                <ChevronsUpDown className='h-4 w-4' />
                <span className='sr-only'>Toggle</span>
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            {/* Padding für den Inhalt */}
            <CardContent className='pt-2 pb-4 px-3 md:px-4'>
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
                <ul className='space-y-0'>
                  {' '}
                  {/* Kein space-y mehr, Trennung durch border */}
                  {openEvents.map((event, index) => {
                    if (
                      !event ||
                      typeof event.id !== 'number' ||
                      !Array.isArray(event.options)
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
                    const currentUISelection = selectedTips[event.id];
                    const persistedTip = userSubmittedTips[event.id];

                    let tipButtonText = 'Tipp abgeben';
                    if (
                      persistedTip &&
                      currentUISelection &&
                      currentUISelection !== persistedTip
                    ) {
                      tipButtonText = 'Tipp ändern';
                    } else if (persistedTip && !currentUISelection) {
                      tipButtonText = 'Tipp ändern';
                    }
                    if (tipIsBeingSubmitted) {
                      tipButtonText = 'Sende...';
                    }

                    const isSubmitButtonDisabled =
                      tipIsBeingSubmitted ||
                      !currentUISelection ||
                      currentUISelection === persistedTip;

                    return (
                      <li
                        key={event.id}
                        // Design-Anpassung: Keine separate Karte mehr, nur Trennlinie
                        className={cn(
                          'py-5 space-y-4',
                          index < openEvents.length - 1
                            ? 'border-b border-white/10 dark:border-white/5'
                            : '' // Trennlinie außer beim letzten Element
                        )}
                      >
                        {/* Event Details */}
                        <div>
                          <h3 className='font-semibold text-base text-foreground'>
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

                        {/* Tipp-Bereich - ggf. Hintergrund leicht anpassen */}
                        <div className='bg-white/5 dark:bg-black/10 rounded-md p-3 space-y-3'>
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
                                        ? 'default' // Ausgewählt im UI -> Primary
                                        : showAsPersisted
                                          ? 'secondary' // Gespeichert -> Secondary
                                          : 'outline' // Noch nicht ausgewählt/gespeichert -> Outline
                                    }
                                    className={cn(
                                      'transition-all text-xs sm:text-sm border-border/50', // Outline-Border ggf. subtiler
                                      isSelectedInUI &&
                                        'ring-2 ring-primary/70 ring-offset-background ring-offset-1',
                                      showAsPersisted &&
                                        'border-dashed border-primary/50 opacity-90 font-semibold'
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
                              {persistedTip &&
                                !currentUISelection &&
                                !tipIsBeingSubmitted && (
                                  <div className='flex items-center gap-1 text-sm text-green-500 dark:text-green-400 font-medium'>
                                    <CheckCircle className='w-4 h-4' />
                                    Getippt: {persistedTip}
                                  </div>
                                )}
                            </div>
                            <div className='flex items-center gap-2'>
                              {currentUISelection &&
                                persistedTip &&
                                currentUISelection !== persistedTip && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size='icon' // Nur Icon Button für mehr Platz
                                        variant='ghost'
                                        className='text-muted-foreground hover:text-destructive h-8 w-8'
                                        onClick={() =>
                                          onClearSelectedTip(event.id)
                                        }
                                        disabled={tipIsBeingSubmitted}
                                        aria-label='Auswahl verwerfen'
                                      >
                                        <RotateCcw className='h-3.5 w-3.5' />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className='bg-popover text-popover-foreground border-border'>
                                      <p>Auswahl verwerfen</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              <Button
                                size='sm'
                                variant='default' // Hauptaktion immer 'default'
                                onClick={() => onSubmitTip(event.id)}
                                disabled={isSubmitButtonDisabled}
                                className='bg-primary hover:bg-primary/90 text-primary-foreground' // Sicherstellen, dass Styling passt
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
                          <div className='pt-3 border-t border-white/10 dark:border-white/5 mt-4'>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant='outline' // Outline oder Ghost für weniger Dominanz
                                  size='sm'
                                  disabled={resultIsBeingSet}
                                  className='gap-1.5 text-muted-foreground hover:text-foreground border-border/50 hover:border-foreground/30' // Subtilerer Rand
                                >
                                  <Edit className='w-3.5 h-3.5' />
                                  {resultIsBeingSet
                                    ? 'Speichere...'
                                    : 'Ergebnis eintragen'}
                                </Button>
                              </DialogTrigger>
                              {/* Dialog-Inhalt bleibt funktional gleich, aber mit angepasstem Styling */}
                              <DialogContent className='sm:max-w-[425px] bg-background border-border'>
                                <ShadDialogHeader>
                                  <ShadDialogTitle className='text-foreground'>
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
                                          className='w-full justify-start border-border/50' // Subtilerer Rand
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
                                        {' '}
                                        Abbrechen{' '}
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
                                      variant='default' // Primäre Aktion
                                    >
                                      {resultIsBeingSet ? (
                                        <>
                                          {' '}
                                          <Loader2 className='h-4 w-4 animate-spin mr-2' />{' '}
                                          Speichere...{' '}
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
