// src/app/components/dashboard/OpenEventsCard.tsx
'use client';

import React, { useState, useCallback } from 'react'; // useCallback importiert, falls noch nicht geschehen
import type { Event as GroupEvent, UserOut } from '@/app/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import {
  Flame,
  PlusCircle,
  MoreHorizontal,
  Trash2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';

/* -------------------------------------------------------------------------- */
/* SingleOpenEventItem                             */
/* (Diese Komponente bleibt für diese Anforderung unverändert, da die Filterung in OpenEventsCard erfolgt) */
/* -------------------------------------------------------------------------- */
interface SingleOpenEventItemProps {
  event: GroupEvent;
  user: UserOut | null | undefined;
  groupCreatedBy: number | null | undefined;
  onInitiateDeleteEvent: (event: GroupEvent) => void;
  selectedTips: Record<number, string>;
  userSubmittedTips: Record<number, string>; // Wird hier nicht direkt für die Filterung benötigt, aber für die Anzeige innerhalb des Items
  resultInputs: Record<number, string>;
  isSubmittingTip: Record<number, boolean>;
  isSettingResult: Record<number, boolean>;
  onSelectTip: (eventId: number, option: string) => void;
  onSubmitTip: (eventId: number) => Promise<void>;
  onResultInputChange: (eventId: number, value: string) => void;
  onSetResult: (eventId: number, winningOption: string) => Promise<void>;
  onClearSelectedTip: (eventId: number) => void;
}

// Die Definition von SingleOpenEventItem bleibt wie in deinem Code,
// da die Logik "Tipp abgeben", "Auswahl löschen" etc. weiterhin für Events gilt,
// die hier (nach der Filterung) angezeigt werden.
// Der Zustand userHasSubmittedTip innerhalb von SingleOpenEventItem wird für diese gefilterte Liste immer false sein.
export function SingleOpenEventItem({
  // Stellen sicher, dass dies die korrekte SingleOpenEventItem ist
  event,
  user,
  groupCreatedBy,
  onInitiateDeleteEvent,
  selectedTips,
  userSubmittedTips, // Diese Prop wird übergeben, aber für die Anzeige in der gefilterten Liste
  // wird userHasSubmittedTip in diesem Item immer false sein.
  resultInputs,
  isSubmittingTip,
  isSettingResult,
  onSelectTip,
  onSubmitTip,
  onResultInputChange,
  onSetResult,
  onClearSelectedTip,
}: SingleOpenEventItemProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeleteActionPending, setIsDeleteActionPending] = useState(false);

  const canDeleteEvent =
    user?.id === groupCreatedBy || user?.id === event.createdById;

  // Für die hier angezeigten Events sollte userHasSubmittedTip immer false sein,
  // da wir in OpenEventsCard bereits danach filtern.
  // Die Anzeige "(Dein Tipp)" und das Deaktivieren der Buttons wird also nicht greifen, was korrekt ist.
  const userHasSubmittedTip = !!userSubmittedTips[event.id]; // Bleibt zur Konsistenz, aber sollte hier false sein.
  const selected = selectedTips[event.id];
  const submitting = isSubmittingTip[event.id];
  const settingResult = isSettingResult[event.id];
  const resultInput = resultInputs[event.id];

  const handleDropdownOpenChange = useCallback(
    (open: boolean) => {
      setIsDropdownOpen(open);
      if (!open && isDeleteActionPending) {
        onInitiateDeleteEvent(event);
        setIsDeleteActionPending(false);
      }
    },
    [event, onInitiateDeleteEvent, isDeleteActionPending]
  );

  const handleSelectDeleteAction = useCallback(() => {
    setIsDeleteActionPending(true);
  }, []);

  return (
    <div className='rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4 shadow-sm sm:hover:shadow-md transition-shadow'>
      <div className='flex items-start justify-between gap-4'>
        <div className='flex-1 space-y-1'>
          <h4 className='text-base sm:text-lg font-semibold text-foreground leading-tight'>
            {event.title || 'Unbenanntes Event'}
          </h4>
          {event.description && (
            <p className='text-xs sm:text-sm text-muted-foreground'>
              {event.description}
            </p>
          )}
          {event.question && (
            <p className='mt-1 text-sm font-medium text-primary'>
              {event.question}
            </p>
          )}
        </div>

        {canDeleteEvent && (
          <DropdownMenu
            open={isDropdownOpen}
            onOpenChange={handleDropdownOpenChange}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8 text-muted-foreground hover:text-foreground'
              >
                <MoreHorizontal className='h-4 w-4' />
                <span className='sr-only'>Optionen</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem
                onSelect={handleSelectDeleteAction}
                className='text-destructive'
              >
                <Trash2 className='mr-2 h-4 w-4' /> Event löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className='space-y-2'>
        {event.options?.map((option, i) => (
          <Button
            key={`${event.id}-option-${i}`}
            variant={
              // Da userHasSubmittedTip hier false sein sollte, wird dieser Zweig nicht erreicht
              // userSubmittedTips[event.id] === option ? 'default' :
              selected === option ? 'secondary' : 'outline'
            }
            onClick={() =>
              // !userHasSubmittedTip ist hier immer true
              onSelectTip(event.id, option)
            }
            // disabled={userHasSubmittedTip || submitting} ist hier effektiv disabled={submitting}
            disabled={submitting}
            className='flex w-full items-center justify-between rounded-md px-4 py-3 text-sm transition-colors'
          >
            <span>{option}</span>
            {/* Dieser Teil wird nicht angezeigt, da userHasSubmittedTip false sein sollte
            {userSubmittedTips[event.id] === option && (
              <span className='text-xs text-muted-foreground'>(Dein Tipp)</span>
            )} */}
          </Button>
        ))}
      </div>

      {/* Da userHasSubmittedTip hier false sein sollte, wird dieser Teil nicht angezeigt */}
      {/*!userHasSubmittedTip && selected && ( ... )*/}
      {/* Stattdessen immer anzeigen, wenn etwas ausgewählt ist, da noch nicht getippt wurde */}
      {selected && (
        <div className='flex flex-col gap-2 sm:flex-row'>
          <Button
            onClick={() => onSubmitTip(event.id)}
            disabled={submitting}
            size='sm'
            className='text-sm'
          >
            {submitting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Tipp abgeben
          </Button>

          <Button
            variant='ghost'
            size='sm'
            onClick={() => onClearSelectedTip(event.id)}
            disabled={submitting}
            className='text-sm text-muted-foreground'
          >
            Auswahl löschen
          </Button>
        </div>
      )}
      {/* Dieser Block wird nicht mehr angezeigt, da wir nur Events anzeigen, auf die noch nicht getippt wurde
      {userHasSubmittedTip && (
        <p className='text-sm text-muted-foreground'>
          Dein Tipp: „{userSubmittedTips[event.id]}“
        </p>
      )}*/}

      {user?.id === groupCreatedBy && !event.winningOption && (
        <div className='mt-6 space-y-3 border-t border-muted/30 pt-4'>
          <h5 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            Ergebnis festlegen (Admin)
          </h5>
          <div className='flex flex-wrap gap-2'>
            {event.options?.map((option, i) => (
              <Button
                key={`result-${event.id}-${i}`}
                variant={resultInput === option ? 'default' : 'outline'}
                size='sm'
                onClick={() => onResultInputChange(event.id, option)}
                disabled={settingResult}
              >
                {option}
              </Button>
            ))}
          </div>
          {resultInput && (
            <Button
              onClick={() => onSetResult(event.id, resultInput)}
              disabled={settingResult}
              size='sm'
              className='text-sm'
            >
              {settingResult && (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              )}
              Ergebnis „{resultInput}“ bestätigen
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* OpenEventsCard                               */
/* -------------------------------------------------------------------------- */

interface OpenEventsCardProps {
  events: GroupEvent[];
  user: UserOut | null | undefined;
  groupCreatedBy: number | null | undefined;
  onInitiateDeleteEvent: (event: GroupEvent) => void;
  selectedTips: Record<number, string>;
  userSubmittedTips: Record<number, string>; // Wichtig für die Filterung!
  resultInputs: Record<number, string>;
  isSubmittingTip: Record<number, boolean>;
  isSettingResult: Record<number, boolean>;
  onSelectTip: (eventId: number, option: string) => void;
  onSubmitTip: (eventId: number) => Promise<void>;
  onResultInputChange: (eventId: number, value: string) => void;
  onSetResult: (eventId: number, winningOption: string) => Promise<void>;
  onClearSelectedTip: (eventId: number) => void;
  onOpenAddEventDialog: () => void;
}

export default function OpenEventsCard({
  events,
  user,
  groupCreatedBy,
  onInitiateDeleteEvent,
  selectedTips,
  userSubmittedTips, // Wird jetzt für die Filterung verwendet
  resultInputs,
  isSubmittingTip,
  isSettingResult,
  onSelectTip,
  onSubmitTip,
  onResultInputChange,
  onSetResult,
  onClearSelectedTip,
  onOpenAddEventDialog,
}: OpenEventsCardProps) {
  // NEUER FILTER: Zeige nur offene Events, auf die der aktuelle User NOCH NICHT getippt hat.
  const eventsToDisplay = events.filter(
    (event) =>
      event &&
      !event.winningOption && // Muss offen sein
      !userSubmittedTips[event.id] // UND der User hat noch keinen Tipp dafür abgegeben
  );

  return (
    <Card className='bg-muted/30 border border-border rounded-xl shadow-sm'>
      <CardHeader className='flex flex-row items-center justify-between gap-2 pb-3'>
        {' '}
        {/* flex-row für bessere Ausrichtung */}
        <div className='flex items-center gap-2'>
          <Flame className='h-5 w-5 text-orange-500 dark:text-orange-300 flex-shrink-0' />
          <CardTitle className='text-base sm:text-lg font-semibold text-foreground'>
            Offene Wetten (noch tippen)
          </CardTitle>
        </div>
        <Button
          onClick={onOpenAddEventDialog}
          variant='outline'
          size='sm'
          className='flex items-center gap-1 sm:gap-2 border border-primary/30 text-primary hover:bg-primary/5'
        >
          <PlusCircle className='w-4 h-4' />
          <span className='hidden sm:inline'>Event hinzufügen</span>
        </Button>
      </CardHeader>

      <CardContent
        className={cn(
          'space-y-6',
          eventsToDisplay.length === 0 &&
            'py-8 flex justify-center items-center flex-col text-center' // items-center und flex-col für bessere Zentrierung der Nachricht
        )}
      >
        {eventsToDisplay.length === 0 ? (
          <>
            <Flame className='w-12 h-12 text-muted-foreground/30 mb-2' />{' '}
            {/* Icon für leeren Zustand */}
            <p className='max-w-xs text-sm text-muted-foreground'>
              Keine Wetten offen, auf die du noch tippen musst.
              <br />
              Oder starte eine neue Wette!
            </p>
          </>
        ) : (
          eventsToDisplay.map((event) => (
            <SingleOpenEventItem
              key={event.id}
              event={event}
              user={user}
              groupCreatedBy={groupCreatedBy}
              onInitiateDeleteEvent={onInitiateDeleteEvent}
              selectedTips={selectedTips}
              userSubmittedTips={userSubmittedTips} // Weitergeben, obwohl SingleOpenEventItem es für die Anzeige in dieser Liste nicht mehr braucht
              resultInputs={resultInputs}
              isSubmittingTip={isSubmittingTip}
              isSettingResult={isSettingResult}
              onSelectTip={onSelectTip}
              onSubmitTip={onSubmitTip}
              onResultInputChange={onResultInputChange}
              onSetResult={onSetResult}
              onClearSelectedTip={onClearSelectedTip}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

// Die zweite Definition von SingleOpenEventItem wurde hier entfernt,
// da die erste innerhalb von OpenEventsCard.tsx genutzt und angepasst wurde.
// Wenn du die zweite, exportierte Version verwendest, musst du die Anpassungen
// (insbesondere das Entfernen der Logik für `userHasSubmittedTip`, da diese Info jetzt
// durch die Filterung in der übergeordneten Komponente abgedeckt wird) dort ebenfalls vornehmen.
