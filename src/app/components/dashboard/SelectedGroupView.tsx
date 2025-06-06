'use client';

import { useCallback, useMemo } from 'react';
import type {
  Group,
  Event as GroupEvent,
  UserOut,
  AllTipsPerEvent,
  HighscoreEntry,
  LeaderboardWinner,
} from '@/app/lib/types';
import type { UseGroupInteractionsReturn } from '@/app/hooks/useGroupInteractions';

import DeleteEventDialog from './DeleteEventDialog';
import { GroupHeaderCard } from '@/app/components/dashboard/GroupHeaderCard';
import OpenEventsCard from '@/app/components/dashboard/OpenEventsCard';
import SubmittedOpenEventsCard from './SubmittedOpenEventsCard';
import ClosedEventsCard from '@/app/components/dashboard/ClosedEventsCard';

type SelectedGroupViewProps = {
  group: Group;
  events: GroupEvent[];
  user: UserOut;
  interactions: UseGroupInteractionsReturn;
  userSubmittedTips: Record<number, string>;
  allTipsPerEvent: AllTipsPerEvent;
  highscoreEntries: HighscoreEntry[] | null;
  onDeleteGroup: (group: Group) => void;
  onImageChanged: () => void;
};

export function SelectedGroupView({
  group,
  events,
  user,
  interactions,
  userSubmittedTips,
  allTipsPerEvent,
  highscoreEntries,
  onDeleteGroup,
  onImageChanged,
}: SelectedGroupViewProps) {
  const handleConfirmDeleteEvent = useCallback(
    async (eventId: number) => {
      await interactions.handleConfirmDeleteEvent(eventId);
    },
    [interactions]
  );

  const leaderboardWinner = useMemo((): LeaderboardWinner | null => {
    if (!highscoreEntries || highscoreEntries.length === 0) return null;

    const sorted = [...highscoreEntries].sort((a, b) => b.points - a.points);
    const top = sorted[0];
    if (!top?.name) return null;

    const coWinners = sorted.filter((e) => e.points === top.points);
    if (coWinners.length > 1) {
      const names = coWinners.map((e) => e.name!).join(' & ');
      return { name: names };
    }
    return { name: top.name };
  }, [highscoreEntries]);

  return (
    <div className='space-y-8'>
      <GroupHeaderCard
        group={group}
        leaderboardWinner={leaderboardWinner}
        isAddEventDialogOpen={interactions.isAddEventDialogOpen}
        addEventForm={interactions.addEventForm}
        onSetAddEventDialogOpen={interactions.setIsAddEventDialogOpen}
        onAddEventSubmit={interactions.handleAddEventSubmit}
        currentUserId={user.id}
        onDeleteGroup={onDeleteGroup}
        onImageChanged={onImageChanged}
      />

      <OpenEventsCard
        events={events}
        user={user}
        groupCreatedBy={group.createdById}
        selectedTips={interactions.selectedTips}
        userSubmittedTips={userSubmittedTips}
        resultInputs={interactions.resultInputs}
        isSubmittingTip={interactions.isSubmittingTip}
        isSettingResult={interactions.isSettingResult}
        onSelectTipAction={interactions.handleOptionSelect}
        onSubmitTipAction={interactions.handleSubmitTip}
        onResultInputChangeAction={interactions.handleResultInputChange}
        onSetResultAction={interactions.handleSetResult}
        onClearSelectedTipAction={interactions.handleClearSelectedTip}
        onInitiateDeleteEventAction={interactions.handleInitiateDeleteEvent}
        onOpenAddEventDialogAction={() =>
          interactions.setIsAddEventDialogOpen(true)
        }
        allTipsPerEvent={allTipsPerEvent}
      />

      <SubmittedOpenEventsCard
        events={events}
        user={user}
        groupCreatedBy={group.createdById}
        onInitiateDeleteEventAction={interactions.handleInitiateDeleteEvent}
        userSubmittedTips={userSubmittedTips}
        allTipsPerEvent={allTipsPerEvent}
        resultInputs={interactions.resultInputs}
        isSettingResult={interactions.isSettingResult}
        onResultInputChangeAction={interactions.handleResultInputChange}
        onSetResultAction={interactions.handleSetResult}
      />

      <ClosedEventsCard
        events={events}
        user={user}
        allTipsPerEvent={allTipsPerEvent}
      />

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
