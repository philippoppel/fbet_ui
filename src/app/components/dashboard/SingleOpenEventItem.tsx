'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { Event as GroupEvent, UserOut } from '@/app/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/app/components/ui/collapsible';
import {
  MoreHorizontal,
  Trash2,
  Loader2,
  CheckCircle,
  Users,
  ChevronsUpDown,
  Info,
  EyeOff,
  Clock,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { CommentSection } from '@/app/components/dashboard/CommentSection';
// Annahme: Input Komponente für Ergebnis
// import { Input } from '@/app/components/ui/input';

interface TipDetail {
  userId: number;
  userName: string | null;
  selectedOption: string;
}

interface SingleOpenEventItemProps {
  event: GroupEvent;
  user: UserOut | null | undefined;
  groupCreatedBy: number | null | undefined;
  onInitiateDeleteEventAction: (event: GroupEvent) => void;
  selectedTips: Record<number, string>;
  userSubmittedTips: Record<number, string>;
  allTipsForThisEvent: TipDetail[];
  resultInputs: Record<number, string>;
  isSubmittingTip: Record<number, boolean>;
  isSettingResult: Record<number, boolean>;
  onSelectTipAction: (eventId: number, option: string) => void;
  onSubmitTipAction: (eventId: number) => Promise<void>;
  onResultInputChangeAction: (eventId: number, value: string) => void;
  onSetResultAction: (eventId: number, winningOption: string) => Promise<void>;
  onClearSelectedTipAction: (eventId: number) => void;
}

export function SingleOpenEventItem({
  event,
  user,
  groupCreatedBy,
  onInitiateDeleteEventAction,
  selectedTips,
  userSubmittedTips,
  allTipsForThisEvent,
  resultInputs,
  isSubmittingTip,
  isSettingResult,
  onSelectTipAction,
  onSubmitTipAction,
  onResultInputChangeAction,
  onSetResultAction,
  onClearSelectedTipAction,
}: SingleOpenEventItemProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeleteActionPending, setIsDeleteActionPending] = useState(false);
  const [showDetailedTips, setShowDetailedTips] = useState(false);
  const [timeLeft, setTimeLeft] = useState(() =>
    event.tippingDeadline
      ? new Date(event.tippingDeadline).getTime() - Date.now()
      : 0
  );

  const canDeleteEvent =
    user?.id === groupCreatedBy || user?.id === event.createdById;
  const isEventManager =
    user?.id === event.createdById || user?.id === groupCreatedBy; // Für Ergebnis-Setzung

  const currentUserTipForThisEvent = userSubmittedTips[event.id];
  const userHasSubmittedTip = !!currentUserTipForThisEvent;
  const selectedOptionForTipping = selectedTips[event.id];
  const isSubmittingCurrentEventTip = isSubmittingTip[event.id];
  const isSettingCurrentEventResult = isSettingResult[event.id];
  const currentResultInputForEvent = resultInputs[event.id] || '';

  const handleDropdownOpenChange = useCallback(
    (open: boolean) => {
      setIsDropdownOpen(open);
      if (!open && isDeleteActionPending) {
        onInitiateDeleteEventAction(event);
        setIsDeleteActionPending(false);
      }
    },
    [event, onInitiateDeleteEventAction, isDeleteActionPending]
  );

  const handleSelectDeleteAction = useCallback(() => {
    setIsDeleteActionPending(true);
    // Schließe das Dropdown, um den onOpenChange Handler auszulösen
    setIsDropdownOpen(false);
  }, []);

  const optionVoteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (allTipsForThisEvent && Array.isArray(allTipsForThisEvent)) {
      allTipsForThisEvent.forEach((tipDetail: TipDetail) => {
        counts[tipDetail.selectedOption] =
          (counts[tipDetail.selectedOption] || 0) + 1;
      });
    }
    return counts;
  }, [allTipsForThisEvent]);

  const totalVotesOnEvent = Object.values(optionVoteCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  // --- Countdown Logic ---
  useEffect(() => {
    if (!event.tippingDeadline) {
      setTimeLeft(0);
      return;
    }

    const interval = setInterval(() => {
      // TypeScript weiß hier, dass event.tippingDeadline nicht null ist,
      // aber zur Sicherheit oder bei komplexeren Logiken kann man event.tippingDeadline! verwenden
      // oder eine erneute Prüfung einbauen. Da wir oben schon eine Prüfung haben, ist es hier ok.
      const deadlineTime = new Date(event.tippingDeadline!).getTime();
      const msLeft = deadlineTime - Date.now();
      setTimeLeft(msLeft > 0 ? msLeft : 0);

      // Optionaler Push kurz vor Ablauf
      if (msLeft > 0 && msLeft < 5 * 60 * 1000 && !userHasSubmittedTip) {
        // Hier müsste deine sendPushNotification Funktion aufgerufen werden.
        // Diese Funktion ist nicht Teil dieses Snippets und muss extern implementiert/importiert werden.
        // Beispiel:
        // sendPushNotification({
        //   title: 'Letzte Minuten zum Tippen!',
        //   body: `Für "${event.title}" endet gleich die Deadline!`,
        // });
        console.log(
          `Push-Benachrichtigung für Event "${event.title}" würde jetzt gesendet werden.`
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [event.tippingDeadline, event.title, userHasSubmittedTip]);

  const formatTimeLeft = (ms: number) => {
    if (ms <= 0) return 'Abgelaufen';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  };

  const isUrgent = timeLeft > 0 && timeLeft <= 10 * 60 * 1000; // < 10 Minuten
  const isTippingAllowed = timeLeft > 0 && !event.winningOption;

  return (
    <div className='space-y-4 p-4 border rounded-lg shadow-sm bg-card'>
      <div className='flex justify-between items-start gap-4'>
        <div className='flex-1 space-y-1'>
          <h4 className='text-lg font-semibold text-foreground leading-tight break-words'>
            {event.title || 'Unbenanntes Event'}
          </h4>
          {event.description && (
            <p className='text-sm text-muted-foreground break-words'>
              {event.description}
            </p>
          )}
          <p className='text-sm font-medium text-primary mt-1 break-words'>
            {event.question || 'Frage fehlt.'}
          </p>

          {event.tippingDeadline && (
            <div
              className={cn(
                'mt-1 flex items-center gap-2 text-sm',
                !isTippingAllowed
                  ? 'text-muted-foreground'
                  : isUrgent
                    ? 'text-red-600 dark:text-red-400 font-semibold animate-pulse'
                    : 'text-muted-foreground'
              )}
            >
              <Clock className='h-4 w-4' />
              {isTippingAllowed
                ? `Endet in: ${formatTimeLeft(timeLeft)}`
                : `Tipp-Deadline: Abgelaufen`}
            </div>
          )}
        </div>

        {canDeleteEvent && !event.winningOption && (
          <DropdownMenu
            open={isDropdownOpen}
            onOpenChange={handleDropdownOpenChange}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8 text-muted-foreground hover:text-foreground flex-shrink-0'
                aria-label='Event Optionen'
              >
                <MoreHorizontal className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem
                onSelect={handleSelectDeleteAction}
                className='text-destructive hover:!bg-destructive hover:!text-destructive-foreground focus:!text-destructive-foreground focus:!bg-destructive'
              >
                <Trash2 className='mr-2 h-4 w-4' /> Event löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Tipp Optionen */}
      {!event.winningOption && (
        <div className='space-y-2 mt-3'>
          {event.options &&
            event.options.map((option) => (
              <Button
                key={option}
                variant={
                  selectedOptionForTipping === option ? 'default' : 'outline'
                }
                onClick={() => onSelectTipAction(event.id, option)}
                disabled={
                  userHasSubmittedTip ||
                  !isTippingAllowed ||
                  isSubmittingCurrentEventTip
                }
                className='w-full justify-start text-left h-auto py-2 px-3'
              >
                <span className='flex-1 break-words whitespace-normal'>
                  {option}
                </span>
                {optionVoteCounts[option] > 0 && !showDetailedTips && (
                  <Badge variant='secondary' className='ml-2 flex-shrink-0'>
                    {optionVoteCounts[option]}
                  </Badge>
                )}
              </Button>
            ))}
        </div>
      )}

      {/* Tipp-Submit Button und Status */}
      {selectedOptionForTipping &&
        !userHasSubmittedTip &&
        isTippingAllowed &&
        !event.winningOption && (
          <div className='flex flex-col sm:flex-row gap-2 mt-3'>
            <Button
              onClick={() => onSubmitTipAction(event.id)}
              disabled={isSubmittingCurrentEventTip}
              className='flex-1'
            >
              {isSubmittingCurrentEventTip && (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              )}
              Tipp abgeben für: &#34;{selectedOptionForTipping}&#34;
            </Button>
            <Button
              variant='ghost'
              onClick={() => onClearSelectedTipAction(event.id)}
              disabled={isSubmittingCurrentEventTip}
            >
              Auswahl aufheben
            </Button>
          </div>
        )}

      {userHasSubmittedTip && !event.winningOption && (
        <div className='mt-3 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-md text-sm text-green-700 dark:text-green-300 flex items-center gap-2'>
          <CheckCircle className='h-5 w-5 flex-shrink-0' />
          Dein Tipp wurde erfolgreich für &#34;{currentUserTipForThisEvent}&#34;
          registriert.
        </div>
      )}

      {!isTippingAllowed && !userHasSubmittedTip && !event.winningOption && (
        <div className='mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-md text-sm text-yellow-700 dark:text-yellow-300 flex items-center gap-2'>
          <Info className='h-5 w-5 flex-shrink-0' />
          Die Tipp-Deadline ist abgelaufen. Du hast keinen Tipp für dieses Event
          abgegeben.
        </div>
      )}

      {/* Ergebnis Anzeige und Eingabe */}
      {event.winningOption && (
        <div className='mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-md text-sm'>
          <p className='font-semibold text-blue-700 dark:text-blue-300'>
            Ergebnis des Events:
          </p>
          <p className='text-blue-600 dark:text-blue-200'>
            {event.winningOption}
          </p>
          {userHasSubmittedTip && (
            <p
              className={cn(
                'mt-1 font-medium',
                currentUserTipForThisEvent === event.winningOption
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              )}
            >
              Dein Tipp: &#34;{currentUserTipForThisEvent}&#34; -{' '}
              {currentUserTipForThisEvent === event.winningOption
                ? 'Richtig!'
                : 'Leider falsch.'}
            </p>
          )}
        </div>
      )}

      {isEventManager && !event.winningOption && timeLeft <= 0 && (
        <div className='mt-4 p-3 border-t pt-4 space-y-2'>
          <p className='text-sm font-medium text-foreground'>
            Event Ergebnis festlegen:
          </p>
          <div className='flex flex-col sm:flex-row gap-2'>
            {/* Annahme: Input Komponente wird hier verwendet */}
            {/* <Input
              type="text"
              placeholder="Gewinnende Option eintragen"
              value={currentResultInputForEvent}
              onChange={(e) => onResultInputChangeAction(event.id, e.target.value)}
              className="flex-1"
              disabled={isSettingCurrentEventResult}
            /> */}
            <select
              value={currentResultInputForEvent}
              onChange={(e) =>
                onResultInputChangeAction(event.id, e.target.value)
              }
              className='flex-1 p-2 border rounded-md bg-background text-foreground disabled:opacity-50' // Basic styling, anpassen an deine UI-Lib
              disabled={isSettingCurrentEventResult}
            >
              <option value='' disabled>
                Wähle die gewinnende Option
              </option>
              {event.options &&
                event.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
            </select>
            <Button
              onClick={() =>
                onSetResultAction(event.id, currentResultInputForEvent)
              }
              disabled={
                !currentResultInputForEvent || isSettingCurrentEventResult
              }
            >
              {isSettingCurrentEventResult && (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              )}
              Ergebnis speichern
            </Button>
          </div>
          {event.options &&
            event.options.length > 0 &&
            !event.options.includes(currentResultInputForEvent) &&
            currentResultInputForEvent !== '' && (
              <p className='text-xs text-destructive mt-1'>
                Die eingegebene Option ist keine der vordefinierten
                Event-Optionen.
              </p>
            )}
        </div>
      )}

      {/* Collapsible Tipp-Details */}
      {totalVotesOnEvent > 0 && (
        <Collapsible
          open={showDetailedTips}
          onOpenChange={setShowDetailedTips}
          className='mt-3'
        >
          <CollapsibleTrigger asChild>
            <Button
              variant='link'
              className='p-0 h-auto text-sm flex items-center gap-1'
            >
              {showDetailedTips ? (
                <EyeOff className='h-4 w-4' />
              ) : (
                <Users className='h-4 w-4' />
              )}
              {showDetailedTips
                ? 'Details ausblenden'
                : `Alle ${totalVotesOnEvent} Tipps anzeigen`}
              <ChevronsUpDown className='h-4 w-4' />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className='mt-2 space-y-1 text-sm text-muted-foreground'>
            {event.options &&
              event.options.map((option) => (
                <div key={option} className='flex justify-between items-center'>
                  <span>{option}:</span>
                  <Badge variant='outline'>
                    {optionVoteCounts[option] || 0} Stimme(n)
                  </Badge>
                </div>
              ))}
            {showDetailedTips &&
              allTipsForThisEvent &&
              allTipsForThisEvent.length > 0 && (
                <div className='mt-2 pt-2 border-t'>
                  <p className='font-medium text-foreground'>
                    Abgegebene Tipps:
                  </p>
                  <ul className='list-disc pl-5'>
                    {allTipsForThisEvent.map((tip) => (
                      <li key={tip.userId}>
                        {tip.userName || `User ID ${tip.userId}`}:{' '}
                        {tip.selectedOption}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </CollapsibleContent>
        </Collapsible>
      )}

      {user && <CommentSection eventId={event.id} currentUser={user} />}
    </div>
  );
}
