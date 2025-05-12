'use client';

import React, { useState, useCallback } from 'react';
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
/*                               OpenEventsCard                               */
/* -------------------------------------------------------------------------- */

interface OpenEventsCardProps {
  events: GroupEvent[];
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
  const openEvents = events.filter((event) => event && !event.winningOption);

  return (
    <Card className='bg-muted/30 border border-border rounded-xl shadow-sm'>
      {/* ---------- Card Header ---------- */}
      <CardHeader className='flex items-center justify-between gap-2 pb-3'>
        <div className='flex items-center gap-2'>
          <Flame className='h-5 w-5 text-orange-500 dark:text-orange-300' />
          <CardTitle className='text-base sm:text-lg font-semibold text-foreground'>
            Offene Wetten
          </CardTitle>
        </div>

        {/* Add‑event button is now always visible */}
        <Button
          onClick={onOpenAddEventDialog}
          variant='outline'
          size='sm'
          className='flex items-center gap-1 sm:gap-2 border border-primary/30 text-primary hover:bg-primary/5'
        >
          <PlusCircle className='w-4 h-4' />
          {/* Hide the label on very small screens to save space */}
          <span className='hidden sm:inline'>Event hinzufügen</span>
        </Button>
      </CardHeader>

      {/* ---------- Card Content ---------- */}
      <CardContent
        className={cn(
          'space-y-6',
          openEvents.length === 0 && 'py-8 flex justify-center'
        )}
      >
        {openEvents.length === 0 ? (
          <p className='max-w-xs text-center text-sm text-muted-foreground'>
            Noch keine Wette aktiv. Starte gleich die erste!
          </p>
        ) : (
          openEvents.map((event) => (
            <SingleOpenEventItem
              key={event.id}
              event={event}
              user={user}
              groupCreatedBy={groupCreatedBy}
              onInitiateDeleteEvent={onInitiateDeleteEvent}
              selectedTips={selectedTips}
              userSubmittedTips={userSubmittedTips}
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

/* -------------------------------------------------------------------------- */
/*                            SingleOpenEventItem                             */
/* -------------------------------------------------------------------------- */

interface SingleOpenEventItemProps {
  event: GroupEvent;
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
}

export function SingleOpenEventItem({
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

  const userHasSubmittedTip = !!userSubmittedTips[event.id];
  const selected = selectedTips[event.id];
  const submitting = isSubmittingTip[event.id];
  const settingResult = isSettingResult[event.id];
  const resultInput = resultInputs[event.id];

  /* ----------------------------- Callbacks ----------------------------- */
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

  /* ------------------------------ Render ------------------------------- */
  return (
    <div className='rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4 shadow-sm sm:hover:shadow-md transition-shadow'>
      {/* -------- Header -------- */}
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

      {/* -------- Options -------- */}
      <div className='space-y-2'>
        {event.options?.map((option, i) => (
          <Button
            key={`${event.id}-option-${i}`}
            variant={
              userSubmittedTips[event.id] === option
                ? 'default'
                : selected === option
                  ? 'secondary'
                  : 'outline'
            }
            onClick={() =>
              !userHasSubmittedTip && onSelectTip(event.id, option)
            }
            disabled={userHasSubmittedTip || submitting}
            className='flex w-full items-center justify-between rounded-md px-4 py-3 text-sm transition-colors'
          >
            <span>{option}</span>
            {userSubmittedTips[event.id] === option && (
              <span className='text-xs text-muted-foreground'>(Dein Tipp)</span>
            )}
          </Button>
        ))}
      </div>

      {/* -------- Action buttons -------- */}
      {!userHasSubmittedTip && selected && (
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

      {/* -------- Submitted tip -------- */}
      {userHasSubmittedTip && (
        <p className='text-sm text-muted-foreground'>
          Dein Tipp: „{userSubmittedTips[event.id]}“
        </p>
      )}

      {/* -------- Admin result section -------- */}
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
