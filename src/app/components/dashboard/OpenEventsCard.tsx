'use client';

import type { Event as GroupEvent, UserOut } from '@/app/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Flame, PlusCircle } from 'lucide-react';
import { SingleOpenEventItem } from './SingleOpenEventItem';
import { cn } from '@/app/lib/utils';

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

export function OpenEventsCard({
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

  if (openEvents.length === 0) {
    return (
      <Card className='bg-muted/30 border border-border rounded-xl shadow-sm'>
        <CardHeader className='flex items-center gap-2 pb-3'>
          <Flame className='h-5 w-5 text-orange-500 dark:text-orange-300' />
          <CardTitle className='text-base sm:text-lg font-semibold text-foreground'>
            Offene Wetten
          </CardTitle>
        </CardHeader>
        <CardContent className='py-8 text-center text-sm text-muted-foreground'>
          <div className='flex flex-col items-center gap-4'>
            <Button
              onClick={onOpenAddEventDialog}
              variant='ghost'
              className='flex items-center gap-2 text-primary border border-primary/30 hover:bg-primary/5'
            >
              <PlusCircle className='w-4 h-4' />
              Event hinzufügen
            </Button>
            <p className='text-xs sm:text-sm'>
              Noch keine Wette aktiv. Füge oben ein neues Event hinzu und lade
              deine Freunde ein!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='bg-muted/30 border border-border rounded-xl shadow-sm'>
      <CardHeader className='flex items-center gap-2 pb-3'>
        <Flame className='h-5 w-5 text-orange-500 dark:text-orange-300' />
        <CardTitle className='text-base sm:text-lg font-semibold text-foreground'>
          Offene Wetten
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-6'>
        {openEvents.map((event) => (
          <div
            key={event.id}
            className='rounded-xl bg-card border border-border p-5 sm:p-6 shadow-sm transition-colors hover:shadow-md'
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
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
