// src/components/dashboard/SelectedGroupView.tsx
'use client';

import type { UseFormReturn } from 'react-hook-form';
import type {
  Group,
  Event as GroupEvent,
  UserOut,
  MixedEvent,
} from '@/app/lib/types';

import { GroupHeaderCard } from './GroupHeaderCard';
import { OpenEventsCard } from './OpenEventsCard';
import { ClosedEventsCard } from './ClosedEventsCard';
import type { AddEventFormData } from '@/app/hooks/useGroupInteractions'; // Sicherstellen, dass der Pfad stimmt

// Props Definition (angepasst)
type SelectedGroupViewProps = {
  group: Group;
  events: GroupEvent[];
  user: UserOut;
  selectedTips: Record<number, string>;
  userSubmittedTips: Record<number, string>; // <<--- NEU: Prop für gespeicherte Tipps
  resultInputs: Record<number, string>;
  isSubmittingTip: Record<number, boolean>;
  isSettingResult: Record<number, boolean>;
  isAddEventDialogOpen: boolean;
  addEventForm: UseFormReturn<AddEventFormData>;
  onSelectTip: (eventId: number, option: string) => void;
  onSubmitTip: (eventId: number) => void;
  onResultInputChange: (eventId: number, value: string) => void;
  onSetResult: (eventId: number, winningOption: string) => void; // Erwartet string
  onSetAddEventDialogOpen: (isOpen: boolean) => void;
  onAddEventSubmit: (values: AddEventFormData) => void;
  onClearSelectedTip: (eventId: number) => void; // <<--- NEU: Prop für das Löschen der UI-Auswahl
};

export function SelectedGroupView({
  group,
  events,
  user,
  selectedTips,
  userSubmittedTips, // <<--- Destrukturieren
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
  onClearSelectedTip, // <<--- Destrukturieren
}: SelectedGroupViewProps) {
  return (
    <div className='space-y-8'>
      <GroupHeaderCard
        group={group}
        isAddEventDialogOpen={isAddEventDialogOpen}
        addEventForm={addEventForm}
        onSetAddEventDialogOpen={onSetAddEventDialogOpen}
        onAddEventSubmit={onAddEventSubmit}
      />

      <OpenEventsCard
        events={events}
        user={user}
        groupCreatedBy={group.createdById}
        selectedTips={selectedTips}
        userSubmittedTips={userSubmittedTips} // <<--- Weitergeben
        resultInputs={resultInputs}
        isSubmittingTip={isSubmittingTip}
        isSettingResult={isSettingResult}
        onSelectTip={onSelectTip}
        onSubmitTip={onSubmitTip}
        onResultInputChange={onResultInputChange}
        onSetResult={onSetResult} // onSetResult erwartet string
        onClearSelectedTip={onClearSelectedTip} // <<--- Weitergeben
      />

      <ClosedEventsCard events={events} />
    </div>
  );
}
