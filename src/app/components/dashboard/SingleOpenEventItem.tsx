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
  onSubmitTipAction: (eventId: number) => Promise<void>;
  onWildcardInputChangeAction: (eventId: number, value: string) => void;
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
  const isEventManager = canDeleteEvent;

  const currentUserTipForThisEvent = userSubmittedTips[event.id];
  const userHasSubmittedTip = !!currentUserTipForThisEvent;
  const selectedOptionForTipping = selectedTips[event.id];
  const wildcardGuessValue = wildcardInputs[event.id] || '';
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
    setIsDropdownOpen(false);
  }, []);

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

  /* -------- Countdown -------- */
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
      {/* Header */}
      <div className='flex justify-between items-start gap-4'>
        <div className='flex-1 space-y-1'>
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
          <DropdownMenu
            open={isDropdownOpen}
            onOpenChange={handleDropdownOpenChange}
          >
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='icon' className='h-8 w-8'>
                <MoreHorizontal className='h-4 w-4' />
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

      {/* Tipp Optionen */}
      {!event.winningOption && (
        <div className='space-y-2 mt-3'>
          {event.options?.map((option) => (
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
              className='w-full justify-start h-auto py-2 px-3'
            >
              <span className='flex-1 break-words'>{option}</span>
              {optionVoteCounts[option] > 0 && !showDetailedTips && (
                <Badge variant='secondary' className='ml-2'>
                  {optionVoteCounts[option]}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      )}

      {/* Wildcard Input */}
      {event.hasWildcard && isTippingAllowed && !userHasSubmittedTip && (
        <input
          type='text'
          placeholder={
            event.wildcardPrompt || 'Wildcard (z. B. 2:1 oder „KO Runde 3“) …'
          }
          value={wildcardGuessValue}
          onChange={(e) =>
            onWildcardInputChangeAction(event.id, e.target.value)
          }
          className='mt-2 w-full border rounded-md p-2 text-sm'
          disabled={isSubmittingCurrentEventTip}
        />
      )}

      {/* Tipp-Submit */}
      {selectedOptionForTipping && !userHasSubmittedTip && isTippingAllowed && (
        <div className='flex flex-col sm:flex-row gap-2 mt-3'>
          <Button
            onClick={() => onSubmitTipAction(event.id)}
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

      {/* Tipp bestätigt */}
      {userHasSubmittedTip && !event.winningOption && (
        <div className='mt-3 p-3 bg-green-50 border rounded-md text-sm flex gap-2'>
          <CheckCircle className='h-5 w-5 flex-shrink-0' />
          Dein Tipp: „{currentUserTipForThisEvent}“
        </div>
      )}

      {/* Ergebnis setzen */}
      {isEventManager && !event.winningOption && timeLeft <= 0 && (
        <div className='mt-4 p-3 border-t space-y-2'>
          <p className='text-sm font-medium'>Event-Ergebnis festlegen</p>
          <div className='flex flex-col sm:flex-row gap-2'>
            <select
              value={currentResultInputForEvent}
              onChange={(e) =>
                onResultInputChangeAction(event.id, e.target.value)
              }
              className='flex-1 p-2 border rounded-md'
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

      {/* Ergebnis Anzeige */}
      {event.winningOption && (
        <div className='mt-3 p-3 bg-blue-50 border rounded-md text-sm'>
          Ergebnis: <strong>{event.winningOption}</strong>
          {event.wildcardAnswer && (
            <div className='mt-1'>
              Wildcard: <strong>{event.wildcardAnswer}</strong>
            </div>
          )}
        </div>
      )}

      {/* Tipp-Details */}
      {totalVotesOnEvent > 0 && (
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
                ? 'Details ausblenden'
                : `Alle ${totalVotesOnEvent} Tipps anzeigen`}
              <ChevronsUpDown className='h-4 w-4 ml-1' />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className='mt-2 space-y-1 text-sm'>
            {event.options?.map((opt) => (
              <div key={opt} className='flex justify-between'>
                <span>{opt}</span>
                <Badge variant='outline'>{optionVoteCounts[opt] || 0}</Badge>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {user && <CommentSection eventId={event.id} currentUser={user} />}
    </div>
  );
}
