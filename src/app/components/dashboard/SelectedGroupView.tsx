'use client';

import { useCallback, useMemo } from 'react'; // useMemo hinzugefügt
import type {
  Group,
  Event as GroupEvent,
  UserOut,
  AllTipsPerEvent,
  HighscoreEntry, // NEU: Importieren
  LeaderboardWinner, // NEU: Importieren (oder stelle sicher, dass es global/aus types.ts verfügbar ist)
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
  highscoreEntries: HighscoreEntry[] | null; // NEU: Prop hinzugefügt
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
  highscoreEntries, // NEU: Prop empfangen
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
    if (!highscoreEntries || highscoreEntries.length === 0) {
      return null;
    }

    // Erstelle eine Kopie, um sie zu sortieren, falls das Original nicht verändert werden soll
    const sortedScores = [...highscoreEntries].sort(
      (a, b) => b.points - a.points
    );
    const topPlayer = sortedScores[0];

    if (topPlayer && topPlayer.name != null) {
      // Stelle sicher, dass der Name existiert
      // Prüfe auf Gleichstand beim ersten Platz
      const coWinners = sortedScores.filter(
        (p) => p.points === topPlayer.points
      );
      if (coWinners.length > 1) {
        const names = coWinners
          .map((p) => p.name)
          .filter((name) => name != null) as string[];
        if (names.length > 0) {
          return { name: names.join(' & ') }; // z.B. "Alice & Bob"
        }
      } else {
        return { name: topPlayer.name };
      }
    }
    return null;
  }, [highscoreEntries]);

  return (
    <div className='space-y-8'>
      <GroupHeaderCard
        group={group}
        leaderboardWinner={leaderboardWinner} // NEU: Den ermittelten Gewinner übergeben
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
        onSelectTip={interactions.handleOptionSelect}
        onSubmitTip={interactions.handleSubmitTip}
        onResultInputChange={interactions.handleResultInputChange}
        onSetResult={interactions.handleSetResult}
        onClearSelectedTip={interactions.handleClearSelectedTip}
        onInitiateDeleteEvent={interactions.handleInitiateDeleteEvent}
        onOpenAddEventDialog={() => interactions.setIsAddEventDialogOpen(true)}
      />

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
