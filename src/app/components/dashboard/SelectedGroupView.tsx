// src/components/dashboard/SelectedGroupView.tsx
'use client';

import type { UseFormReturn } from 'react-hook-form';
import type {
  Group,
  Event as GroupEvent,
  UserOut,
  // MixedEvent, // MixedEvent wird hier nicht verwendet
} from '@/app/lib/types';

import { GroupHeaderCard } from './GroupHeaderCard';
import { OpenEventsCard } from './OpenEventsCard';
import { ClosedEventsCard } from './ClosedEventsCard';
import type { AddEventFormData } from '@/app/hooks/useGroupInteractions';

// Props Definition
type SelectedGroupViewProps = {
  group: Group;
  events: GroupEvent[];
  user: UserOut; // Wichtig: Das User-Objekt
  selectedTips: Record<number, string>;
  userSubmittedTips: Record<number, string>;
  resultInputs: Record<number, string>;
  isSubmittingTip: Record<number, boolean>;
  isSettingResult: Record<number, boolean>;
  isAddEventDialogOpen: boolean;
  addEventForm: UseFormReturn<AddEventFormData>;
  onSelectTip: (eventId: number, option: string) => void;
  onSubmitTip: (eventId: number) => void;
  onResultInputChange: (eventId: number, value: string) => void;
  onSetResult: (eventId: number, winningOption: string) => void;
  onSetAddEventDialogOpen: (isOpen: boolean) => void;
  onAddEventSubmit: (values: AddEventFormData) => void;
  onClearSelectedTip: (eventId: number) => void;
  onDeleteGroup: (group: Group) => void; // <<--- NEU: onDeleteGroup Prop hinzugefügt
};

export function SelectedGroupView({
  group,
  events,
  user, // User-Objekt wird hier empfangen
  selectedTips,
  userSubmittedTips,
  resultInputs,
  isSubmittingTip,
  isSettingResult,
  isAddEventDialogOpen,
  addEventForm,
  onSelectTip,
  onSubmitTip,
  onResultInputChange,
  onSetResult,
  onSetAddEventDialogOpen,
  onAddEventSubmit,
  onClearSelectedTip,
  onDeleteGroup, // <<--- onDeleteGroup hier destrukturieren
}: SelectedGroupViewProps) {
  // DEBUG-Log, um zu prüfen, ob user.id hier ankommt
  console.log(
    `[SelectedGroupView] User ID für GroupHeaderCard: ${user?.id} (Typ: ${typeof user?.id})`
  );
  console.log(`[SelectedGroupView] Group-Objekt für GroupHeaderCard:`, group);
  console.log(
    `[SelectedGroupView] onDeleteGroup Funktion übergeben:`,
    typeof onDeleteGroup === 'function'
  );

  return (
    <div className='space-y-8'>
      <GroupHeaderCard
        group={group}
        isAddEventDialogOpen={isAddEventDialogOpen}
        addEventForm={addEventForm}
        onSetAddEventDialogOpen={onSetAddEventDialogOpen}
        onAddEventSubmit={onAddEventSubmit}
        currentUserId={user?.id} // <<--- HIER HINZUGEFÜGT: Die User ID weitergeben
        onDeleteGroup={onDeleteGroup} // <<--- HIER HINZUGEFÜGT: Die Löschfunktion weitergeben
      />

      <OpenEventsCard
        events={events}
        user={user}
        groupCreatedBy={group.createdById}
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

      <ClosedEventsCard events={events} />
    </div>
  );
}
