// src/app/components/dashboard/SingleOpenEventItem.tsx
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

// Props von OpenEventsCard, die für ein einzelnes Event relevant sind
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

  const LOG_PREFIX_ITEM = `[SingleOpenEventItem EID:${event.id}]`;

  const canDeleteEvent =
    (user && groupCreatedBy && user.id === groupCreatedBy) ||
    (user &&
      typeof event.createdById === 'number' &&
      user.id === event.createdById);

  const userHasSubmittedTipForThisEvent =
    userSubmittedTips && !!userSubmittedTips[event.id];

  const handleDropdownOpenChange = useCallback(
    (open: boolean) => {
      console.log(
        `${LOG_PREFIX_ITEM} handleDropdownOpenChange - Neuer Zustand: ${open}, isDeleteActionPending: ${isDeleteActionPending}`
      );
      setIsDropdownOpen(open);
      if (!open && isDeleteActionPending) {
        console.log(
          `${LOG_PREFIX_ITEM} Dropdown geschlossen, führe ausstehende Löschaktion aus.`
        );
        onInitiateDeleteEvent(event);
        setIsDeleteActionPending(false);
      }
    },
    [event, onInitiateDeleteEvent, isDeleteActionPending, LOG_PREFIX_ITEM]
  );

  const handleSelectDeleteAction = useCallback(() => {
    console.log(
      `${LOG_PREFIX_ITEM} handleSelectDeleteAction - "Event löschen" ausgewählt.`
    );
    setIsDeleteActionPending(true);
    // setIsDropdownOpen(false); // Radix schließt das Menü bei onSelect, was onOpenChange auslöst
  }, [LOG_PREFIX_ITEM]);

  return (
    <div
      // key={event.id} // Der Key gehört in die .map() Schleife in OpenEventsCard.tsx
      className='p-4 border rounded-lg shadow-sm bg-card hover:shadow-md transition-shadow relative'
    >
      <div className='flex justify-between items-start mb-3'>
        <div className='flex-1 pr-10'>
          <h4 className='font-semibold text-lg text-foreground break-words'>
            {event.title || 'Unbenanntes Event'}
          </h4>
          {event.description && (
            <p className='text-sm text-muted-foreground mt-1 break-words'>
              {event.description}
            </p>
          )}
          <p className='text-sm text-primary font-medium mt-2 break-words'>
            {event.question || 'Keine Frage für dieses Event.'}
          </p>
        </div>

        {canDeleteEvent && (
          <div className='absolute top-2 right-2 z-10'>
            <DropdownMenu
              open={isDropdownOpen}
              onOpenChange={handleDropdownOpenChange}
            >
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' size='icon' className='h-8 w-8'>
                  <MoreHorizontal className='h-4 w-4' />
                  <span className='sr-only'>
                    Optionen für {event.title || 'Event'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align='end'
                className='bg-background border p-1 rounded-md shadow-lg'
              >
                <DropdownMenuItem
                  onSelect={handleSelectDeleteAction}
                  className='text-destructive hover:!bg-destructive hover:!text-destructive-foreground focus:bg-destructive/90 focus:text-destructive-foreground cursor-pointer p-2 text-sm flex items-center'
                >
                  <Trash2 className='mr-2 h-4 w-4' />
                  Event löschen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <div className='space-y-2'>
        {event.options && event.options.length > 0 ? (
          event.options.map((option, index) => (
            <Button
              key={`${event.id}-option-${option.replace(/\s+/g, '_')}-${index}`} // <<< KEY GEÄNDERT
              variant={
                userSubmittedTips[event.id] === option
                  ? 'default'
                  : selectedTips[event.id] === option
                    ? 'secondary'
                    : 'outline'
              }
              onClick={() => {
                if (userHasSubmittedTipForThisEvent) return;
                if (typeof onSelectTip === 'function')
                  onSelectTip(event.id, option);
              }}
              disabled={
                userHasSubmittedTipForThisEvent ||
                (isSubmittingTip && !!isSubmittingTip[event.id])
              }
              className='w-full justify-start text-left h-auto py-2 px-3 whitespace-normal'
            >
              {option}
              {userSubmittedTips[event.id] === option && (
                <span className='ml-auto pl-2 text-xs opacity-75 font-normal'>
                  (Dein Tipp)
                </span>
              )}
            </Button>
          ))
        ) : (
          <p className='text-xs text-muted-foreground'>
            Für dieses Event sind keine Wettoptionen verfügbar.
          </p>
        )}
      </div>

      {!userHasSubmittedTipForThisEvent &&
        selectedTips &&
        selectedTips[event.id] && (
          <div className='mt-3 flex items-center gap-2'>
            <Button
              onClick={() => {
                if (typeof onSubmitTip === 'function') onSubmitTip(event.id);
              }}
              disabled={isSubmittingTip && !!isSubmittingTip[event.id]}
              size='sm'
            >
              {isSubmittingTip && isSubmittingTip[event.id] && (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              )}
              Tipp abgeben
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => {
                if (typeof onClearSelectedTip === 'function')
                  onClearSelectedTip(event.id);
              }}
              disabled={isSubmittingTip && !!isSubmittingTip[event.id]}
            >
              Auswahl löschen
            </Button>
          </div>
        )}
      {userHasSubmittedTipForThisEvent && (
        <p className='text-sm text-muted-foreground mt-3'>
          Dein Tipp für dieses Event: „{userSubmittedTips[event.id]}“.
        </p>
      )}

      {user &&
        groupCreatedBy &&
        user.id === groupCreatedBy &&
        !event.winningOption && (
          <div className='mt-4 border-t pt-4'>
            <h5 className='text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2'>
              Ergebnis festlegen (Admin)
            </h5>
            <div className='flex flex-wrap gap-2'>
              {event.options && event.options.length > 0 ? (
                event.options.map((option, index) => (
                  <Button
                    key={`result-${event.id}-option-${option.replace(/\s+/g, '_')}-${index}`} // <<< KEY GEÄNDERT
                    variant={
                      resultInputs[event.id] === option
                        ? 'secondary'
                        : 'outline'
                    }
                    size='sm'
                    onClick={() => {
                      if (typeof onResultInputChange === 'function')
                        onResultInputChange(event.id, option);
                    }}
                    disabled={isSettingResult && !!isSettingResult[event.id]}
                  >
                    {option}
                  </Button>
                ))
              ) : (
                <p className='text-xs text-muted-foreground'>
                  Keine Optionen verfügbar, um Ergebnis festzulegen.
                </p>
              )}
            </div>
            {resultInputs && resultInputs[event.id] && (
              <Button
                onClick={() => {
                  if (typeof onSetResult === 'function')
                    onSetResult(event.id, resultInputs[event.id]);
                }}
                disabled={isSettingResult && !!isSettingResult[event.id]}
                size='sm'
                variant='default'
                className='mt-3'
              >
                {isSettingResult && isSettingResult[event.id] && (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                )}
                Ergebnis „{resultInputs[event.id]}“ bestätigen
              </Button>
            )}
          </div>
        )}
    </div>
  );
}
