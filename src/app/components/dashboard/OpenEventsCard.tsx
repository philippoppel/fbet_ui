// src/app/components/dashboard/OpenEventsCard.tsx
'use client';

import React, { useState } from 'react';
import type {
  Event as GroupEvent,
  UserOut,
  AllTipsPerEvent,
} from '@/app/lib/types'; // AllTipsPerEvent importiert
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/app/components/ui/collapsible';
import { Flame, PlusCircle, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { SingleOpenEventItem } from '@/app/components/dashboard/SingleOpenEventItem';

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
  allTipsPerEvent: AllTipsPerEvent; // NEUE PROP
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
  allTipsPerEvent, // NEUE PROP empfangen
  onSelectTip,
  onSubmitTip,
  onResultInputChange,
  onSetResult,
  onClearSelectedTip,
  onOpenAddEventDialog,
}: OpenEventsCardProps) {
  const [isOpen, setIsOpen] = useState(true);

  const eventsToDisplay = events.filter(
    (event) => event && !event.winningOption && !userSubmittedTips[event.id]
  );

  return (
    <Card className='bg-muted/30 border border-border rounded-xl shadow-sm'>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className='flex flex-row items-center justify-between gap-2 pb-4 px-4 sm:px-6 pt-4 sm:pt-5'>
          <div className='flex items-center gap-2.5'>
            <Flame className='h-5 w-5 text-orange-500 dark:text-orange-400 flex-shrink-0' />
            <CardTitle className='text-base sm:text-lg font-semibold text-foreground'>
              Offene Wetten (noch tippen)
            </CardTitle>
          </div>
          <div className='flex gap-2 items-center'>
            {user && (
              <Button
                onClick={onOpenAddEventDialog}
                variant='outline'
                size='sm'
                className='flex items-center gap-1.5 sm:gap-2 text-primary hover:bg-primary/10 hover:text-primary border-primary/40'
              >
                <PlusCircle className='w-4 h-4' />
                <span className='hidden sm:inline'>Event hinzufügen</span>
                <span className='sm:hidden'>Neu</span>
              </Button>
            )}
            <CollapsibleTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8 text-muted-foreground hover:text-foreground'
              >
                <ChevronsUpDown className='h-4 w-4' />
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent
            className={cn(
              eventsToDisplay.length === 0
                ? 'py-10 flex justify-center items-center flex-col text-center px-4'
                : 'p-4 sm:p-6'
            )}
          >
            {eventsToDisplay.length === 0 ? (
              <>
                <Flame className='w-14 h-14 text-muted-foreground/25 mb-3' />
                <p className='max-w-xs text-sm text-muted-foreground'>
                  Keine Wetten offen, auf die du noch tippen musst.
                  <br />
                  Starte eine neue Wette über den Button oben!
                </p>
              </>
            ) : (
              eventsToDisplay.map((event) => (
                <div
                  key={event.id}
                  className='mb-6 rounded-xl border bg-card shadow-sm hover:shadow-md p-6'
                >
                  <SingleOpenEventItem
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
                    allTipsForThisEvent={allTipsPerEvent[event.id] || []} // NEU: Prop übergeben
                  />
                </div>
              ))
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
