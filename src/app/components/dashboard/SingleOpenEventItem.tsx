// src/app/components/dashboard/SingleOpenEventItem.tsx
'use client';

import React, { useState, useCallback, useMemo } from 'react';
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
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { CommentSection } from '@/app/components/dashboard/CommentSection';

interface TipDetail {
  userId: number;
  userName: string | null;
  selectedOption: string;
}

interface SingleOpenEventItemProps {
  event: GroupEvent;
  user: UserOut | null | undefined; // Kann auch UserOut sein, je nach Anwendungsfall
  groupCreatedBy: number | null | undefined;
  onInitiateDeleteEvent: (event: GroupEvent) => void;
  selectedTips: Record<number, string>;
  userSubmittedTips: Record<number, string>;
  allTipsForThisEvent: TipDetail[];
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
  allTipsForThisEvent,
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
  const [showDetailedTips, setShowDetailedTips] = useState(false);

  const canDeleteEvent =
    user?.id === groupCreatedBy || user?.id === event.createdById;

  const currentUserTipForThisEvent = userSubmittedTips[event.id];
  const userHasSubmittedTip = !!currentUserTipForThisEvent;
  const selectedOptionForTipping = selectedTips[event.id];
  const isSubmittingCurrentEventTip = isSubmittingTip[event.id];
  const isSettingCurrentEventResult = isSettingResult[event.id];
  const currentResultInputForEvent = resultInputs[event.id];

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

  return (
    <div className='space-y-4'>
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
              >
                <MoreHorizontal className='h-4 w-4' />
                <span className='sr-only'>Optionen</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem
                onSelect={handleSelectDeleteAction}
                className='text-destructive hover:!text-destructive-foreground focus:!text-destructive-foreground'
              >
                <Trash2 className='mr-2 h-4 w-4' /> Event löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className='space-y-2'>
        <div className='flex items-center justify-between mb-2 text-sm text-muted-foreground'>
          <span>Optionen</span>
          {totalVotesOnEvent > 0 && (
            <span className='flex items-center gap-1'>
              <Users className='h-4 w-4' />
              {totalVotesOnEvent} {totalVotesOnEvent === 1 ? 'Tipp' : 'Tipps'}{' '}
              insgesamt
            </span>
          )}
        </div>
        {event.options?.map((option, i) => {
          const totalVotesForOption = optionVoteCounts[option] || 0;
          const isCurrentUserSubmittedTip =
            currentUserTipForThisEvent === option;

          return (
            <Button
              key={`${event.id}-option-${i}`}
              variant={
                isCurrentUserSubmittedTip
                  ? 'default'
                  : selectedOptionForTipping === option
                    ? 'secondary'
                    : 'outline'
              }
              onClick={() => {
                if (!userHasSubmittedTip) onSelectTip(event.id, option);
              }}
              disabled={userHasSubmittedTip || isSubmittingCurrentEventTip}
              className={cn(
                'w-full justify-start py-3 px-4 text-sm rounded-md transition-colors whitespace-normal break-words h-auto text-left flex items-center gap-2',
                userHasSubmittedTip ? 'cursor-not-allowed' : 'hover:bg-accent'
              )}
            >
              <span className='flex-grow'>{option}</span>
              {isCurrentUserSubmittedTip && (
                <Badge variant='outline' className='text-xs whitespace-nowrap'>
                  <CheckCircle className='h-3 w-3 mr-1.5 text-green-500' />
                  Dein Tipp
                </Badge>
              )}
              {userHasSubmittedTip && totalVotesForOption > 0 && (
                <Badge
                  variant={isCurrentUserSubmittedTip ? 'outline' : 'secondary'}
                  className='text-xs whitespace-nowrap'
                >
                  {totalVotesForOption}{' '}
                  {totalVotesForOption === 1 ? 'Stimme' : 'Stimmen'}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {userHasSubmittedTip && totalVotesOnEvent > 0 && (
        <Collapsible
          open={showDetailedTips}
          onOpenChange={setShowDetailedTips}
          className='mt-3'
        >
          <CollapsibleTrigger asChild>
            <Button
              variant='ghost'
              className='text-sm p-0 h-auto flex items-center text-muted-foreground hover:text-foreground'
            >
              <Info className='h-4 w-4 mr-1.5' />
              {showDetailedTips
                ? 'Tipp-Details ausblenden'
                : 'Wer hat was getippt? Anzeigen'}
              <ChevronsUpDown className='h-4 w-4 ml-1.5 opacity-70' />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className='mt-3 space-y-3 text-sm p-4 bg-muted/50 rounded-md border border-border/60'>
            {event.options?.map((optionString) => {
              const tippersForThisOption = allTipsForThisEvent.filter(
                (tip) => tip.selectedOption === optionString
              );

              if (tippersForThisOption.length === 0) {
                return (
                  <div key={`detail-empty-${optionString}`}>
                    <p className='font-medium text-foreground'>
                      {optionString}:
                    </p>
                    <p className='text-xs text-muted-foreground italic pl-2'>
                      Keine Tipps für diese Option.
                    </p>
                  </div>
                );
              }

              return (
                <div key={`detail-option-${optionString}`}>
                  <p className='font-medium text-foreground'>{optionString}:</p>
                  <ul className='list-disc list-inside pl-4 space-y-1 mt-1'>
                    {tippersForThisOption.map((tip) => (
                      <li key={tip.userId} className='text-muted-foreground'>
                        {tip.userName || `Benutzer-ID: ${tip.userId}`}
                        {tip.userId === user?.id && (
                          <span className='text-xs text-primary ml-1'>
                            (Du)
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            {allTipsForThisEvent.length === 0 && (
              <p className='text-muted-foreground italic'>
                Noch keine Tipps für dieses Event abgegeben.
              </p>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}

      {!userHasSubmittedTip && totalVotesOnEvent > 0 && (
        <div className='mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-md text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2'>
          <EyeOff className='h-5 w-5 flex-shrink-0' />
          <span>
            Andere Tipps werden sichtbar, sobald du deinen eigenen Tipp
            abgegeben hast.
          </span>
        </div>
      )}

      {!userHasSubmittedTip && selectedOptionForTipping && (
        <div className='flex gap-2 pt-2'>
          <Button
            onClick={() => onSubmitTip(event.id)}
            disabled={isSubmittingCurrentEventTip}
            size='sm'
            className='text-sm'
          >
            {isSubmittingCurrentEventTip && (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            )}
            Tipp abgeben
          </Button>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => onClearSelectedTip(event.id)}
            disabled={isSubmittingCurrentEventTip}
            className='text-sm text-muted-foreground'
          >
            Auswahl löschen
          </Button>
        </div>
      )}

      {user?.id === groupCreatedBy &&
        !event.winningOption &&
        userHasSubmittedTip && (
          <div className='mt-6 border-t pt-4 border-border/60'>
            <h5 className='text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2'>
              Ergebnis festlegen (Admin)
            </h5>
            <div className='flex flex-wrap gap-2'>
              {event.options?.map((option, i) => (
                <Button
                  key={`result-${event.id}-${i}`}
                  variant={
                    currentResultInputForEvent === option
                      ? 'default'
                      : 'outline'
                  }
                  size='sm'
                  className='w-full justify-start py-3 px-4 text-sm rounded-md transition-colors whitespace-normal break-words h-auto text-left flex items-center gap-2'
                  onClick={() => onResultInputChange(event.id, option)}
                  disabled={isSettingCurrentEventResult}
                >
                  {option}
                </Button>
              ))}
            </div>
            {currentResultInputForEvent && (
              <Button
                onClick={() =>
                  onSetResult(event.id, currentResultInputForEvent)
                }
                disabled={isSettingCurrentEventResult}
                size='sm'
                className='mt-3 text-sm whitespace-normal break-words h-auto py-1.5 px-2 text-center'
              >
                {isSettingCurrentEventResult && (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                )}
                Ergebnis „{currentResultInputForEvent}“ bestätigen
              </Button>
            )}
          </div>
        )}

      {user && <CommentSection eventId={event.id} currentUser={user} />}
    </div>
  );
}
