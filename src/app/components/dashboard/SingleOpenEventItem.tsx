'use client';

import React, { useState, useCallback } from 'react';
import type { Event as GroupEvent, UserOut } from '@/app/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Button } from '@/app/components/ui/button';
import { MoreHorizontal, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/app/lib/utils';

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
    <div className='rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm space-y-4 transition-colors hover:shadow-md'>
      <div className='flex justify-between items-start gap-4'>
        <div className='flex-1 space-y-1'>
          <h4 className='text-lg font-semibold text-foreground leading-tight'>
            {event.title || 'Unbenanntes Event'}
          </h4>
          {event.description && (
            <p className='text-sm text-muted-foreground'>{event.description}</p>
          )}
          <p className='text-sm font-medium text-primary mt-1'>
            {event.question || 'Frage fehlt.'}
          </p>
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
              userSubmittedTips[event.id] === option
                ? 'default'
                : selected === option
                  ? 'secondary'
                  : 'outline'
            }
            onClick={() => {
              if (!userHasSubmittedTip) onSelectTip(event.id, option);
            }}
            disabled={userHasSubmittedTip || submitting}
            className='w-full justify-start py-3 px-4 text-sm rounded-md transition-colors hover:bg-accent'
          >
            {option}
            {userSubmittedTips[event.id] === option && (
              <span className='ml-auto text-xs text-muted-foreground'>
                (Dein Tipp)
              </span>
            )}
          </Button>
        ))}
      </div>

      {!userHasSubmittedTip && selected && (
        <div className='flex gap-2'>
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

      {userHasSubmittedTip && (
        <p className='text-sm text-muted-foreground'>
          Dein Tipp: „{userSubmittedTips[event.id]}“
        </p>
      )}

      {user?.id === groupCreatedBy && !event.winningOption && (
        <div className='mt-6 border-t pt-4 border-muted/30'>
          <h5 className='text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2'>
            Ergebnis festlegen (Admin)
          </h5>
          <div className='flex flex-wrap gap-2'>
            {event.options?.map((option, i) => (
              <Button
                key={`result-${event.id}-${i}`}
                variant={resultInput === option ? 'default' : 'outline'}
                size='sm'
                className='text-sm'
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
              className='mt-3 text-sm'
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
