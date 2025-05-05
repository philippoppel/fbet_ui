// src/components/dashboard/SelectedGroupView.tsx
'use client';

import type { UseFormReturn } from 'react-hook-form';
// Importiere den Typ aus DashboardPage (oder wo immer er definiert ist)
import type {
  Group,
  Event as GroupEvent,
  UserOut,
  MixedEvent,
} from '@/lib/types';

// Importiere die neuen Kind-Komponenten
import { GroupHeaderCard } from './GroupHeaderCard';
import { OpenEventsCard } from './OpenEventsCard';
import { ClosedEventsCard } from './ClosedEventsCard';
import { AddEventFormData } from '@/hooks/useGroupInteractions';

// Props Definition (angepasst für 3-Spalten-Layout und aufgeteilte Komponenten)
type SelectedGroupViewProps = {
  group: Group;
  events: GroupEvent[];
  combinedEvents: MixedEvent[]; // Für Vorschläge im Dialog
  user: UserOut;
  selectedTips: Record<number, string>;
  resultInputs: Record<number, string>;
  isSubmittingTip: Record<number, boolean>;
  isSettingResult: Record<number, boolean>;
  isAddEventDialogOpen: boolean;
  addEventForm: UseFormReturn<AddEventFormData>; // Korrekter Typ verwenden
  onSelectTip: (eventId: number, option: string) => void;
  onSubmitTip: (eventId: number) => void;
  onResultInputChange: (eventId: number, value: string) => void;
  onSetResult: (eventId: number, options: string[]) => void;
  onSetAddEventDialogOpen: (isOpen: boolean) => void;
  onAddEventSubmit: (values: AddEventFormData) => void;
};

export function SelectedGroupView({
  group,
  events,
  combinedEvents,
  user,
  selectedTips,
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
}: SelectedGroupViewProps) {
  // Rendert nur noch den Container und die Kind-Komponenten
  return (
    <div className='space-y-8'>
      {/* Übergibt alle Props, die für Header und Dialog benötigt werden */}
      <GroupHeaderCard
        group={group}
        combinedEvents={combinedEvents}
        isAddEventDialogOpen={isAddEventDialogOpen}
        addEventForm={addEventForm}
        onSetAddEventDialogOpen={onSetAddEventDialogOpen}
        onAddEventSubmit={onAddEventSubmit}
      />

      {/* Übergibt alle Props, die für offene Events benötigt werden */}
      <OpenEventsCard
        events={events} // Übergibt alle Events, Filterung intern
        user={user}
        groupCreatedBy={group.created_by} // Nur ID übergeben
        selectedTips={selectedTips}
        resultInputs={resultInputs}
        isSubmittingTip={isSubmittingTip}
        isSettingResult={isSettingResult}
        onSelectTip={onSelectTip}
        onSubmitTip={onSubmitTip}
        onResultInputChange={onResultInputChange}
        onSetResult={onSetResult}
      />

      {/* Übergibt alle Props, die für geschlossene Events benötigt werden */}
      <ClosedEventsCard
        events={events} // Übergibt alle Events, Filterung intern
      />
    </div>
  );
}
