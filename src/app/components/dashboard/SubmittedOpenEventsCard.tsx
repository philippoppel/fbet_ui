'use client';

import React, { useState } from 'react';
import type {
  Event as GroupEvent,
  UserOut,
  AllTipsPerEvent,
} from '@/app/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Eye, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/app/components/ui/collapsible';
import { SingleOpenEventItem } from '@/app/components/dashboard/SingleOpenEventItem';

interface SubmittedOpenEventsCardProps {
  events: GroupEvent[];
  user: UserOut;
  groupCreatedBy: number | null | undefined;
  onInitiateDeleteEventAction: (event: GroupEvent) => void;
  userSubmittedTips: Record<number, string>;
  allTipsPerEvent: AllTipsPerEvent;
  resultInputs: Record<number, string>;
  isSettingResult: Record<number, boolean>;
  isSubmittingTip: Record<number, boolean>;
  selectedTips: Record<number, string>;
  onResultInputChangeAction: (eventId: number, value: string) => void;
  onSetResultAction: (eventId: number, winningOption: string) => Promise<void>;
  wildcardResultInputs: Record<number, string>;
  onWildcardResultInputChangeAction: (eventId: number, value: string) => void;
  onSetWildcardResultAction: (
    eventId: number,
    wildcardResult: string
  ) => Promise<void>;
  wildcardInputs: Record<number, string>;
  onWildcardInputChangeAction: (eventId: number, value: string) => void;
  onSelectTipAction: (eventId: number, option: string) => void;
  onSubmitTipAction: (eventId: number, wildcardGuess?: string) => Promise<void>;
  onClearSelectedTipAction: (eventId: number) => void;
}

export default function SubmittedOpenEventsCard({
  events,
  user,
  groupCreatedBy,
  onInitiateDeleteEventAction,
  userSubmittedTips,
  allTipsPerEvent,
  resultInputs,
  isSettingResult,
  isSubmittingTip,
  selectedTips,
  onResultInputChangeAction,
  onSetResultAction,
  wildcardResultInputs,
  onWildcardResultInputChangeAction,
  onSetWildcardResultAction,
  wildcardInputs,
  onWildcardInputChangeAction,
  onSelectTipAction,
  onSubmitTipAction,
  onClearSelectedTipAction,
}: SubmittedOpenEventsCardProps) {
  const [isOpen, setIsOpen] = useState(true);

  const submittedEvents = events.filter(
    (e): e is GroupEvent =>
      !!e && !e.winningOption && userSubmittedTips[e.id] !== undefined
  );

  if (submittedEvents.length === 0) return null;

  return (
    <Card className='bg-muted/30 border border-border rounded-xl shadow-sm'>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className='flex flex-row items-center justify-between gap-2 cursor-pointer'>
          <div className='flex items-center gap-2 flex-grow'>
            <Eye className='h-5 w-5 text-blue-500 dark:text-blue-300 flex-shrink-0' />
            <CardTitle className='text-base sm:text-lg font-semibold text-foreground'>
              Meine Tipps für offene Wetten ({submittedEvents.length})
            </CardTitle>
          </div>
          <CollapsibleTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8 text-muted-foreground hover:text-foreground flex-shrink-0'
            >
              <ChevronsUpDown className='h-4 w-4' />
              <span className='sr-only'>Toggle</span>
            </Button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent
            className={
              submittedEvents.length === 0
                ? 'py-10 flex justify-center items-center flex-col text-center px-4'
                : 'p-4 sm:p-6 space-y-6'
            }
          >
            {submittedEvents.map((event) => (
              <div
                key={event.id}
                className='rounded-xl border bg-card shadow-sm hover:shadow-md p-4 sm:p-6'
              >
                <SingleOpenEventItem
                  event={event}
                  user={user}
                  groupCreatedBy={groupCreatedBy}
                  onInitiateDeleteEventAction={onInitiateDeleteEventAction}
                  selectedTips={selectedTips}
                  userSubmittedTips={userSubmittedTips}
                  allTipsForThisEvent={allTipsPerEvent[event.id] || []}
                  resultInputs={resultInputs}
                  isSubmittingTip={isSubmittingTip}
                  isSettingResult={isSettingResult}
                  onSelectTipAction={onSelectTipAction}
                  onSubmitTipAction={onSubmitTipAction}
                  onResultInputChangeAction={onResultInputChangeAction}
                  onSetResultAction={onSetResultAction}
                  onClearSelectedTipAction={onClearSelectedTipAction}
                  wildcardInputs={wildcardInputs}
                  onWildcardInputChangeAction={onWildcardInputChangeAction}
                  wildcardResultInputs={wildcardResultInputs}
                  onWildcardResultInputChangeAction={
                    onWildcardResultInputChangeAction
                  }
                  onSetWildcardResultAction={onSetWildcardResultAction}
                />
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
