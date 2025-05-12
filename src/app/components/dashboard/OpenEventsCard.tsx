// src/app/components/dashboard/OpenEventsCard.tsx
'use client';

import React, { useState, useCallback } from 'react';
// Optional: date-fns importieren, wenn für Formatierung verwendet
// import { format, differenceInHours } from 'date-fns'; // differenceInHours für Zeitvergleich
// import { de } from 'date-fns/locale';
import {
  // Stelle sicher, dass GroupEvent aus types.ts tippingDeadline enthält
  Event as GroupEvent,
  UserOut,
} from '@/app/lib/types';
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
  Clock, // Icon für Deadline
  AlertTriangle, // Icon für nahende Deadline
} from 'lucide-react';
import { cn } from '@/app/lib/utils';

/* -------------------------------------------------------------------------- */
/* SingleOpenEventItem (Intern, mit Deadline-Logik & "Bald"-Anzeige)          */
/* -------------------------------------------------------------------------- */
interface SingleOpenEventItemProps {
  // Typ muss tippingDeadline zulassen
  event: GroupEvent & { tippingDeadline?: Date | string | null };
  user: UserOut | null | undefined;
  groupCreatedBy: number | null | undefined;
  onInitiateDeleteEvent: (event: GroupEvent) => void;
  selectedTips: Record<number, string>;
  userSubmittedTips: Record<number, string>; // Hier immer leer wegen Filterung
  resultInputs: Record<number, string>;
  isSubmittingTip: Record<number, boolean>;
  isSettingResult: Record<number, boolean>;
  onSelectTip: (eventId: number, option: string) => void;
  onSubmitTip: (eventId: number) => Promise<void>;
  onResultInputChange: (eventId: number, value: string) => void;
  onSetResult: (eventId: number, winningOption: string) => Promise<void>;
  onClearSelectedTip: (eventId: number) => void;
}

// Hilfsfunktion zum Formatieren der Deadline
const formatDeadline = (date: Date | null): string | null => {
  if (!date) return null;
  try {
    // Verwendung von toLocaleString für einfache, lokale Formatierung
    return (
      date.toLocaleString('de-DE', {
        // Passe Locale an
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' Uhr'
    );
    // Alternative mit date-fns:
    // return format(date, "dd.MM.yyyy HH:mm 'Uhr'", { locale: de });
  } catch {
    return 'Ungültiges Datum'; // Fallback
  }
};

// Diese Komponente wird nur *innerhalb* von OpenEventsCard verwendet
function SingleOpenEventItem({
  event,
  user,
  groupCreatedBy,
  onInitiateDeleteEvent,
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
}: SingleOpenEventItemProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeleteActionPending, setIsDeleteActionPending] = useState(false);

  const canDeleteEvent =
    user?.id === groupCreatedBy || user?.id === event.createdById;

  // --- Deadline Logik ---
  const now = new Date();
  // Sicherstellen, dass event.tippingDeadline ein Date-Objekt wird, falls es ein String ist
  const deadline = event.tippingDeadline
    ? new Date(event.tippingDeadline)
    : null;
  // Prüfen ob Deadline existiert und in der Vergangenheit liegt
  const deadlinePassed = deadline ? now >= deadline : false;
  const formattedDeadline = deadline ? formatDeadline(deadline) : null;

  // Prüfen, ob Deadline bald erreicht ist (z.B. weniger als 24 Stunden)
  const hoursUntilDeadline =
    deadline && !deadlinePassed
      ? (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)
      : null;
  const isDeadlineSoon = hoursUntilDeadline !== null && hoursUntilDeadline < 24;

  // --- Tipp-Zustand Logik ---
  const selected = selectedTips[event.id];
  const submitting = isSubmittingTip[event.id];
  const settingResult = isSettingResult[event.id];
  const resultInput = resultInputs[event.id];
  // Da diese Komponente nur für Events gerendert wird, auf die der User noch nicht getippt hat,
  // können wir userHasSubmittedTip hier als false annehmen.
  const userHasSubmittedTip = false;
  // Tippen ist erlaubt, wenn der User *nicht* getippt hat UND die Deadline *nicht* überschritten ist.
  const isTippingAllowed = !userHasSubmittedTip && !deadlinePassed;

  // --- Callbacks ---
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
      {/* Header mit Titel, Beschreibung, Frage, Admin-Optionen */}
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
          {/* Deadline Anzeige (ANGEPASST für "Bald"-Status) */}
          {formattedDeadline && (
            <div
              className={cn(
                'flex items-center gap-1.5 mt-2',
                // Styling-Priorität: Abgelaufen (rot) > Bald (orange) > Normal (grau)
                deadlinePassed
                  ? 'text-destructive'
                  : isDeadlineSoon
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-muted-foreground'
              )}
            >
              {/* Optional anderes Icon, wenn bald fällig */}
              {isDeadlineSoon && !deadlinePassed ? (
                <AlertTriangle className='h-3.5 w-3.5 flex-shrink-0' />
              ) : (
                <Clock className='h-3.5 w-3.5 flex-shrink-0' />
              )}
              <p className='text-xs font-medium'>
                Tipp-Deadline: {formattedDeadline}
                {deadlinePassed && ' (Abgelaufen)'}
                {/* Optionaler Textzusatz für "bald" */}
                {isDeadlineSoon && !deadlinePassed && ' (Endet bald!)'}
              </p>
            </div>
          )}
        </div>

        {/* Admin Dropdown */}
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

      {/* Optionen-Buttons */}
      <div className='space-y-2'>
        {event.options?.map((option, i) => (
          <Button
            key={`${event.id}-option-${i}`}
            variant={selected === option ? 'secondary' : 'outline'}
            onClick={() => {
              if (isTippingAllowed) onSelectTip(event.id, option);
            }}
            // Verwende isTippingAllowed für die Deaktivierung
            disabled={!isTippingAllowed || submitting}
            className={cn(
              'flex w-full items-center justify-start rounded-md px-4 py-3 text-sm transition-colors',
              // Style für deaktiviert, wenn Tippen nicht (mehr) erlaubt ist
              !isTippingAllowed &&
                'opacity-60 cursor-not-allowed hover:bg-transparent'
            )}
          >
            <span>{option}</span>
          </Button>
        ))}
      </div>

      {/* Nachricht, wenn Deadline vorbei ist */}
      {deadlinePassed && (
        <p className='text-sm text-destructive font-medium text-center px-2 py-1 bg-destructive/10 rounded-md border border-destructive/30'>
          Die Tipp-Deadline für diese Wette ist abgelaufen.
        </p>
      )}

      {/* Tipp abgeben / Auswahl löschen Buttons */}
      {/* Nur anzeigen, wenn etwas ausgewählt ist UND Tippen noch erlaubt ist */}
      {selected && isTippingAllowed && (
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

      {/* Ergebnis festlegen (Admin) */}
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
              className='mt-3 text-sm' // mt-3 hinzugefügt für Abstand
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
/* OpenEventsCard (Container) - Unverändert                                   */
/* -------------------------------------------------------------------------- */
interface OpenEventsCardProps {
  events: GroupEvent[]; // Sollte Events mit tippingDeadline enthalten
  user: UserOut | null | undefined;
  groupCreatedBy: number | null | undefined;
  onInitiateDeleteEvent: (event: GroupEvent) => void;
  selectedTips: Record<number, string>;
  userSubmittedTips: Record<number, string>;
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
  userSubmittedTips,
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
  // Filter: Zeige nur offene Events, auf die der User NOCH NICHT getippt hat.
  const eventsToDisplay = events.filter(
    (event) =>
      event &&
      !event.winningOption && // Muss offen sein
      !userSubmittedTips[event.id] // UND der User hat noch keinen Tipp dafür abgegeben
  );

  return (
    <Card className='bg-muted/30 border border-border rounded-xl shadow-sm'>
      <CardHeader className='flex flex-row items-center justify-between gap-2 pb-3'>
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
          // Wenn keine Events da sind, zentrierten Text anzeigen
          eventsToDisplay.length === 0
            ? 'py-8 flex justify-center items-center flex-col text-center'
            : // Sonst Padding und Abstände für die Event-Items
              'space-y-6 p-4 sm:p-6'
        )}
      >
        {eventsToDisplay.length === 0 ? (
          // Leerer Zustand
          <>
            <Flame className='w-12 h-12 text-muted-foreground/30 mb-2' />
            <p className='max-w-xs text-sm text-muted-foreground'>
              Keine Wetten offen, auf die du noch tippen musst.
              <br />
              Oder starte eine neue Wette!
            </p>
          </>
        ) : (
          // Liste der offenen Event-Items rendern
          eventsToDisplay.map((event) => (
            <SingleOpenEventItem // Die angepasste interne Komponente
              key={event.id}
              event={event}
              user={user}
              groupCreatedBy={groupCreatedBy}
              onInitiateDeleteEvent={onInitiateDeleteEvent}
              selectedTips={selectedTips}
              userSubmittedTips={userSubmittedTips} // Wird hier nicht wirklich genutzt
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
