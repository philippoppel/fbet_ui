// src/app/components/dashboard/SubmittedOpenEventsCard.tsx
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

/* -------------------------------------------------------------------------- */
/* Props                                                                      */
/* -------------------------------------------------------------------------- */

interface SubmittedOpenEventsCardProps {
  events: GroupEvent[];
  user: UserOut;
  groupCreatedBy: number | null | undefined;

  /* actions  – benennung nach Next-15-Konvention */
  onInitiateDeleteEventAction: (event: GroupEvent) => void;
  onResultInputChangeAction: (eventId: number, value: string) => void;
  onSetResultAction: (eventId: number, winningOption: string) => Promise<void>;
  onWildcardInputChangeAction: (eventId: number, value: string) => void;

  /* state */
  userSubmittedTips: Record<number, string>;
  allTipsPerEvent: AllTipsPerEvent;
  resultInputs: Record<number, string>;
  wildcardInputs: Record<number, string>;
  isSettingResult: Record<number, boolean>;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function SubmittedOpenEventsCard({
  events,
  user,
  groupCreatedBy,
  onInitiateDeleteEventAction,
  onResultInputChangeAction,
  onSetResultAction,
  onWildcardInputChangeAction,
  userSubmittedTips,
  allTipsPerEvent,
  resultInputs,
  wildcardInputs,
  isSettingResult,
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
        <CardHeader className='flex items-center justify-between gap-2 cursor-pointer'>
          <div className='flex items-center gap-2 flex-grow'>
            <Eye className='h-5 w-5 text-blue-500 dark:text-blue-300' />
            <CardTitle className='text-base sm:text-lg font-semibold'>
              Meine Tipps für offene Wetten ({submittedEvents.length})
            </CardTitle>
          </div>
          <CollapsibleTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8 text-muted-foreground hover:text-foreground'
            >
              <ChevronsUpDown className='h-4 w-4' />
              <span className='sr-only'>Toggle</span>
            </Button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className='p-4 sm:p-6 space-y-6'>
            {submittedEvents.map((event) => (
              <div
                key={event.id}
                className='rounded-xl border bg-card shadow-sm hover:shadow-md p-4 sm:p-6'
              >
                <SingleOpenEventItem
                  /* basics */
                  event={event}
                  user={user}
                  groupCreatedBy={groupCreatedBy}
                  /* delete */
                  onInitiateDeleteEventAction={onInitiateDeleteEventAction}
                  /* tip-interactions deaktiviert, weil hier nur „bereits getippt“-Ansicht */
                  selectedTips={{}}
                  isSubmittingTip={{}}
                  onSelectTipAction={() => {}}
                  onSubmitTipAction={async () => {}}
                  onClearSelectedTipAction={() => {}}
                  /* result / wildcard management */
                  resultInputs={resultInputs}
                  wildcardInputs={wildcardInputs}
                  isSettingResult={isSettingResult}
                  onResultInputChangeAction={onResultInputChangeAction}
                  onWildcardInputChangeAction={onWildcardInputChangeAction}
                  onSetResultAction={onSetResultAction}
                  /* votes */
                  userSubmittedTips={userSubmittedTips}
                  allTipsForThisEvent={allTipsPerEvent[event.id] ?? []}
                />
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
