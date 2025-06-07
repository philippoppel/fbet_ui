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

interface TipDetail {
  userId: number;
  userName: string | null;
  selectedOption: string;
  wildcardGuess?: string | null;
}

interface SingleOpenEventItemProps {
  event: GroupEvent;
  user: UserOut | null | undefined;
  groupCreatedBy: number | null | undefined;
  onInitiateDeleteEventAction: (event: GroupEvent) => void;
  selectedTips: Record<number, string>;
  wildcardInputs: Record<number, string>;
  userSubmittedTips: Record<number, string>;
  allTipsForThisEvent: TipDetail[];
  resultInputs: Record<number, string>;
  isSubmittingTip: Record<number, boolean>;
  isSettingResult: Record<number, boolean>;
  onSelectTipAction: (eventId: number, option: string) => void;
  onSubmitTipAction: (eventId: number, wildcardGuess?: string) => Promise<void>;
  onWildcardInputChangeAction: (eventId: number, value: string) => void;
  onResultInputChangeAction: (eventId: number, value: string) => void;
  onSetResultAction: (eventId: number, winningOption: string) => Promise<void>;
  onClearSelectedTipAction: (eventId: number) => void;
  wildcardResultInputs: Record<number, string>;
  onWildcardResultInputChangeAction: (eventId: number, value: string) => void;
  onSetWildcardResultAction: (
    eventId: number,
    wildcardResult: string
  ) => Promise<void>;
}

export function SingleOpenEventItem({
  event,
  user,
  groupCreatedBy,
  onInitiateDeleteEventAction,
  selectedTips,
  wildcardInputs,
  userSubmittedTips,
  allTipsForThisEvent,
  resultInputs,
  isSubmittingTip,
  isSettingResult,
  onSelectTipAction,
  onSubmitTipAction,
  onWildcardInputChangeAction,
  onResultInputChangeAction,
  onSetResultAction,
  onClearSelectedTipAction,
  wildcardResultInputs,
  onWildcardResultInputChangeAction,
  onSetWildcardResultAction,
}: SingleOpenEventItemProps) {
  const [showDetailedTips, setShowDetailedTips] = useState(false);
  const [timeLeft, setTimeLeft] = useState(() =>
    event.tippingDeadline
      ? new Date(event.tippingDeadline).getTime() - Date.now()
      : 0
  );

  const canDeleteEvent =
    user?.id === groupCreatedBy || user?.id === event.createdById;
  const isEventManager =
    user?.id === event.createdById || user?.id === groupCreatedBy;

  const currentUserTipForThisEvent = userSubmittedTips[event.id];
  const userHasSubmittedTip = !!currentUserTipForThisEvent;
  const selectedOptionForTipping = selectedTips[event.id];
  const wildcardGuessValue = wildcardInputs[event.id] || '';
  const isSubmittingCurrentEventTip = isSubmittingTip[event.id];
  const isSettingCurrentEventResult = isSettingResult[event.id];
  const currentResultInputForEvent = resultInputs[event.id] || '';
  const currentUserTipDetails = allTipsForThisEvent.find(
    (tip) => tip.userId === user?.id
  );
  const optionVoteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allTipsForThisEvent?.forEach((tip) => {
      counts[tip.selectedOption] = (counts[tip.selectedOption] || 0) + 1;
    });
    return counts;
  }, [allTipsForThisEvent]);

  const totalVotesOnEvent = Object.values(optionVoteCounts).reduce(
    (sum, count) => sum + count,
    0
  );
  const canSetResultNow =
    isEventManager && userHasSubmittedTip && !event.winningOption;

  useEffect(() => {
    if (!event.tippingDeadline) {
      setTimeLeft(0);
      return;
    }
    const interval = setInterval(() => {
      const deadlineTime = new Date(event.tippingDeadline!).getTime();
      const msLeft = deadlineTime - Date.now();
      setTimeLeft(msLeft > 0 ? msLeft : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [event.tippingDeadline]);

  const formatTimeLeft = (ms: number) => {
    if (ms <= 0) return 'Abgelaufen';
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600)
      .toString()
      .padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}h ${m}m ${s}s`;
  };

  const isUrgent = timeLeft > 0 && timeLeft <= 10 * 60 * 1000;
  const isTippingAllowed = timeLeft > 0 && !event.winningOption;

  return (
    <div className='space-y-4 p-4 border rounded-lg shadow-sm bg-card'>
      <div className='flex justify-between items-start gap-4'>
        <div className='flex-1 space-y-1 min-w-0'>
          <h4 className='text-lg font-semibold break-words'>
            {event.title || 'Unbenanntes Event'}
          </h4>
          {event.description && (
            <p className='text-sm text-muted-foreground break-words'>
              {event.description}
            </p>
          )}
          <p className='text-sm font-medium mt-1 break-words'>
            {event.question}
          </p>
          {event.tippingDeadline && (
            <div
              className={cn(
                'mt-1 flex items-center gap-2 text-sm',
                !isTippingAllowed
                  ? 'text-muted-foreground'
                  : isUrgent
                    ? 'text-red-600 font-semibold animate-pulse'
                    : 'text-muted-foreground'
              )}
            >
              <Clock className='h-4 w-4' />
              {isTippingAllowed
                ? `Endet in: ${formatTimeLeft(timeLeft)}`
                : 'Tipp-Deadline: Abgelaufen'}
            </div>
          )}
        </div>

        {canDeleteEvent && !event.winningOption && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8 flex-shrink-0'
              >
                <MoreHorizontal className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem
                onSelect={() => onInitiateDeleteEventAction(event)}
                className='text-destructive'
              >
                <Trash2 className='mr-2 h-4 w-4' /> Event löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {!event.winningOption && !userHasSubmittedTip && (
        <div className='space-y-2 mt-3'>
          {event.options?.map((option, index) => (
            <Button
              key={`${option}-${index}`}
              variant={
                selectedOptionForTipping === option ? 'default' : 'outline'
              }
              onClick={() => onSelectTipAction(event.id, option)}
              disabled={
                userHasSubmittedTip ||
                !isTippingAllowed ||
                isSubmittingCurrentEventTip
              }
              className='w-full flex flex-col items-start h-auto py-2 px-3 text-left space-y-1 whitespace-normal break-words'
            >
              <span className='w-full break-words'>{option}</span>
              {optionVoteCounts[option] > 0 && !showDetailedTips && (
                <Badge variant='secondary'>{optionVoteCounts[option]}</Badge>
              )}
            </Button>
          ))}
        </div>
      )}

      {event.hasWildcard && isTippingAllowed && !userHasSubmittedTip && (
        <div className='mt-4 p-3 border rounded-md bg-muted/10 space-y-2'>
          <div className='flex items-center gap-2'>
            <Info className='h-4 w-4 text-blue-500' />
            <p className='text-sm font-medium text-foreground'>
              Wildcard-Frage
            </p>
          </div>
          <p className='text-xs text-muted-foreground break-words'>
            {event.wildcardPrompt || 'Gib deinen Wert für die Wildcard ein.'}
          </p>
          <input
            type='text'
            placeholder='Dein Wildcard-Tipp…'
            value={wildcardGuessValue}
            onChange={(e) =>
              onWildcardInputChangeAction(event.id, e.target.value)
            }
            className='mt-1 w-full border rounded-md p-2 text-sm'
            disabled={isSubmittingCurrentEventTip}
          />
        </div>
      )}

      {canSetResultNow && event.hasWildcard && !event.wildcardAnswer && (
        <div className='mt-4 p-3 border-t space-y-2'>
          <p className='text-sm font-medium'>Wildcard-Ergebnis festlegen</p>
          <div className='flex flex-col sm:flex-row gap-2'>
            <input
              type='text'
              value={wildcardResultInputs[event.id] || ''}
              onChange={(e) =>
                onWildcardResultInputChangeAction(event.id, e.target.value)
              }
              placeholder='Wildcard Ergebnis eingeben…'
              className='flex-1 p-2 border rounded-md'
            />
            <Button
              onClick={() =>
                onSetWildcardResultAction(
                  event.id,
                  wildcardResultInputs[event.id] || ''
                )
              }
              disabled={isSettingCurrentEventResult}
            >
              {isSettingCurrentEventResult && (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              )}
              Speichern
            </Button>
          </div>
        </div>
      )}

      {selectedOptionForTipping && !userHasSubmittedTip && isTippingAllowed && (
        <div className='flex flex-col sm:flex-row gap-2 mt-3'>
          <Button
            onClick={() => onSubmitTipAction(event.id, wildcardGuessValue)}
            disabled={isSubmittingCurrentEventTip}
            className='flex-1'
          >
            {isSubmittingCurrentEventTip && (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            )}
            Tipp abgeben
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
        <div className='mt-3 p-3 bg-emerald-100 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 rounded-md text-sm text-foreground space-y-2 max-w-full not-button'>
          <div className='flex items-start gap-2'>
            <CheckCircle className='h-5 w-5 flex-shrink-0 mt-0.5' />
            <div className='flex-1 min-w-0'>
              <p className='break-words whitespace-normal m-0'>
                Dein Tipp: „{currentUserTipForThisEvent}“
              </p>
              {event.hasWildcard && currentUserTipDetails?.wildcardGuess && (
                <p className='break-words whitespace-normal m-0 text-sm text-muted-foreground'>
                  Wildcard: „{currentUserTipDetails.wildcardGuess}“
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {canSetResultNow && (
        <div className='mt-4 p-3 border-t space-y-2'>
          <p className='text-sm font-medium'>Event-Ergebnis festlegen</p>
          <div className='flex flex-col sm:flex-row gap-2'>
            <select
              value={currentResultInputForEvent}
              onChange={(e) =>
                onResultInputChangeAction(event.id, e.target.value)
              }
              className='flex-1 p-2 border rounded-md bg-background'
              disabled={isSettingCurrentEventResult}
            >
              <option value='' disabled>
                Gewinnende Option wählen
              </option>
              {event.options?.map((opt) => <option key={opt}>{opt}</option>)}
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
              Speichern
            </Button>
          </div>
        </div>
      )}

      {event.winningOption && (
        <div className='mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border dark:border-blue-800/50 rounded-md text-sm space-y-1'>
          <p className='break-words'>
            Ergebnis: <strong>{event.winningOption}</strong>
          </p>
          {event.wildcardAnswer && (
            <p className='break-words'>
              Wildcard: <strong>{event.wildcardAnswer}</strong>
            </p>
          )}
        </div>
      )}

      {totalVotesOnEvent > 0 && userHasSubmittedTip && (
        <Collapsible
          open={showDetailedTips}
          onOpenChange={setShowDetailedTips}
          className='mt-3'
        >
          <CollapsibleTrigger asChild>
            <Button variant='link' className='p-0 h-auto text-sm'>
              {showDetailedTips ? (
                <EyeOff className='h-4 w-4 mr-1' />
              ) : (
                <Users className='h-4 w-4 mr-1' />
              )}
              {showDetailedTips
                ? 'Tipp-Details ausblenden'
                : `Alle ${totalVotesOnEvent} Tipps anzeigen`}
              <ChevronsUpDown className='h-4 w-4 ml-1' />
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className='mt-3 space-y-3 p-4 bg-muted/50 rounded-md border border-border/60'>
            {event.options?.map((opt, index) => {
              const tippersForOption = allTipsForThisEvent.filter(
                (tip) => tip.selectedOption === opt
              );

              return (
                <div key={`detail-${opt}-${index}`} className='space-y-1'>
                  <div className='flex justify-between items-center mb-1'>
                    <p className='font-medium text-foreground break-words'>
                      {opt}
                    </p>
                    <Badge variant='outline'>
                      {tippersForOption.length}{' '}
                      {tippersForOption.length === 1 ? 'Tipp' : 'Tipps'}
                    </Badge>
                  </div>

                  {tippersForOption.length > 0 ? (
                    <ul className='list-disc list-inside pl-4 space-y-1 text-muted-foreground text-sm'>
                      {tippersForOption.map((tip) => (
                        <li key={tip.userId}>
                          {tip.userName || `Benutzer-ID: ${tip.userId}`}
                          {tip.userId === user?.id && (
                            <span className='text-primary ml-1'>(Du)</span>
                          )}
                          {event.hasWildcard && tip.wildcardGuess && (
                            <div className='text-xs text-muted-foreground'>
                              Wildcard: „{tip.wildcardGuess}“
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className='text-xs text-muted-foreground italic pl-2'>
                      Keine Tipps für diese Option.
                    </p>
                  )}
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      )}

      {user && <CommentSection eventId={event.id} currentUser={user} />}
    </div>
  );
}
