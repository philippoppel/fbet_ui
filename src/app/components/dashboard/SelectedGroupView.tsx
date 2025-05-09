// src/app/components/dashboard/SelectedGroupView.tsx
'use client';

import { useCallback } from 'react';
import type { Group, Event as GroupEvent, UserOut } from '@/app/lib/types';
import type { UseGroupInteractionsReturn } from '@/app/hooks/useGroupInteractions';

import { GroupHeaderCard } from './GroupHeaderCard';
import { OpenEventsCard } from './OpenEventsCard';
import { ClosedEventsCard } from './ClosedEventsCard';
import DeleteEventDialog from './DeleteEventDialog';

type SelectedGroupViewProps = {
  group: Group;
  events: GroupEvent[];
  user: UserOut;
  interactions: UseGroupInteractionsReturn;
  userSubmittedTips: Record<number, string>;
  onDeleteGroup: (group: Group) => void;
};

export function SelectedGroupView({
  group,
  events,
  user,
  interactions,
  userSubmittedTips,
  onDeleteGroup,
}: SelectedGroupViewProps) {
  // -------------------- Handler fürs endgültige Löschen --------------------
  const handleConfirmDeleteEvent = useCallback(
    async (eventId: number) => {
      await interactions.handleConfirmDeleteEvent(eventId);
    },
    [interactions]
  );

  return (
    <div className='space-y-8'>
      {/* ───────── Gruppen-Header ───────── */}
      <GroupHeaderCard
        group={group}
        isAddEventDialogOpen={interactions.isAddEventDialogOpen}
        addEventForm={interactions.addEventForm}
        onSetAddEventDialogOpen={interactions.setIsAddEventDialogOpen}
        onAddEventSubmit={interactions.handleAddEventSubmit}
        currentUserId={user.id}
        onDeleteGroup={onDeleteGroup}
      />

      {/* ───────── Offene Events ───────── */}
      <OpenEventsCard
        events={events}
        user={user}
        groupCreatedBy={group.createdById}
        selectedTips={interactions.selectedTips}
        userSubmittedTips={userSubmittedTips}
        resultInputs={interactions.resultInputs}
        isSubmittingTip={interactions.isSubmittingTip}
        isSettingResult={interactions.isSettingResult}
        onSelectTip={interactions.handleOptionSelect}
        onSubmitTip={interactions.handleSubmitTip}
        onResultInputChange={interactions.handleResultInputChange}
        onSetResult={interactions.handleSetResult}
        onClearSelectedTip={interactions.handleClearSelectedTip}
        onInitiateDeleteEvent={interactions.handleInitiateDeleteEvent}
      />

      {/* ───────── Geschlossene Events ───────── */}
      <ClosedEventsCard events={events} />

      {/* ───────── Delete-Event-Dialog ───────── */}
      {interactions.eventToDelete && ( //  ← nur dann rendern!
        <DeleteEventDialog
          event={interactions.eventToDelete}
          onClose={interactions.resetDeleteEventDialog}
          onConfirm={handleConfirmDeleteEvent}
        />
      )}
    </div>
  );
}
