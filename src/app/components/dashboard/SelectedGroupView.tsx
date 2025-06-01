'use client';

import { useCallback } from 'react';
import type {
  Group,
  Event as GroupEvent,
  UserOut,
  AllTipsPerEvent,
} from '@/app/lib/types'; // NEU: AllTipsPerEvent importieren
import type { UseGroupInteractionsReturn } from '@/app/hooks/useGroupInteractions';

import DeleteEventDialog from './DeleteEventDialog';
import { GroupHeaderCard } from '@/app/components/dashboard/GroupHeaderCard';
import OpenEventsCard from '@/app/components/dashboard/OpenEventsCard';
import SubmittedOpenEventsCard from './SubmittedOpenEventsCard';
import ClosedEventsCard from '@/app/components/dashboard/ClosedEventsCard'; // NEU: Importieren

type SelectedGroupViewProps = {
  group: Group;
  events: GroupEvent[];
  user: UserOut;
  interactions: UseGroupInteractionsReturn;
  userSubmittedTips: Record<number, string>;
  allTipsPerEvent: AllTipsPerEvent; // NEU: Prop hinzugefügt
  onDeleteGroup: (group: Group) => void;
  onImageChanged: () => void;
};

export function SelectedGroupView({
  group,
  events,
  user,
  interactions,
  userSubmittedTips,
  allTipsPerEvent, // NEU: Prop empfangen
  onDeleteGroup,
  onImageChanged,
}: SelectedGroupViewProps) {
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
        onImageChanged={onImageChanged}
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
        onOpenAddEventDialog={() => interactions.setIsAddEventDialogOpen(true)}
      />

      {/* NEU: Wetten mit abgegebenem Tipp (zeigt auch Tipps der anderen) */}
      <SubmittedOpenEventsCard
        events={events}
        user={user}
        groupCreatedBy={group.createdById}
        onInitiateDeleteEvent={interactions.handleInitiateDeleteEvent}
        userSubmittedTips={userSubmittedTips}
        allTipsPerEvent={allTipsPerEvent}
        resultInputs={interactions.resultInputs}
        isSettingResult={interactions.isSettingResult}
        onResultInputChange={interactions.handleResultInputChange}
        onSetResult={interactions.handleSetResult}
      />

      {/* ───────── Geschlossene Events ───────── */}
      <ClosedEventsCard
        events={events}
        user={user}
        allTipsPerEvent={allTipsPerEvent}
      />

      {/* ───────── Delete-Event-Dialog ───────── */}
      {interactions.eventToDelete && (
        <DeleteEventDialog
          event={interactions.eventToDelete}
          onClose={interactions.resetDeleteEventDialog}
          onConfirm={handleConfirmDeleteEvent}
        />
      )}
    </div>
  );
}
