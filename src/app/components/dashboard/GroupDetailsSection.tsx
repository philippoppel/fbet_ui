// src/components/dashboard/GroupDetailsSection.tsx
'use client';

import type {
  Group,
  Event as GroupEvent,
  MixedEvent,
  UserOut,
} from '@/app/lib/types';
import type { UseGroupInteractionsReturn } from '@/app/hooks/useGroupInteractions';

// UI Components
import { Card, CardContent, CardHeader } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Users, TriangleAlert } from 'lucide-react';

// Dashboard Specific Components
import { SelectedGroupView } from '@/app/components/dashboard/SelectedGroupView';

interface GroupDetailsSectionProps {
  selectedGroupId: number | null;
  selectedGroupDetails: Group | null;
  selectedGroupEvents: GroupEvent[];
  userSubmittedTips: Record<number, string>; // <<--- NEU: Empfängt gespeicherte Tipps
  user: UserOut;
  isGroupDataLoading: boolean;
  groupDataError: string | null | undefined;
  interactions: UseGroupInteractionsReturn; // Enthält selectedTips, handleOptionSelect, handleClearSelectedTip etc.
}

// Skeleton Komponente (angenommen, diese ist wie von dir oben gepostet)
function SelectedGroupViewSkeleton() {
  return (
    <div className='space-y-6'>
      {/* Skeleton for GroupHeaderCard */}
      <Card>
        <CardHeader className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-4'>
          <div className='flex-1 space-y-2'>
            <Skeleton className='h-7 w-1/2 rounded' />
            <Skeleton className='h-4 w-3/4 rounded' />
          </div>
          <div className='flex flex-col sm:flex-row gap-2 flex-shrink-0'>
            <Skeleton className='h-9 w-32 rounded-md' />
            <Skeleton className='h-9 w-32 rounded-md' />
          </div>
        </CardHeader>
      </Card>
      {/* Skeleton for OpenEventsCard */}
      <Card>
        <CardHeader className='p-4'>
          <Skeleton className='h-6 w-1/3 rounded' />
        </CardHeader>
        <CardContent className='space-y-4 p-4 pt-0'>
          <Skeleton className='h-24 w-full rounded-lg border p-4' />
          <Skeleton className='h-24 w-full rounded-lg border p-4' />
        </CardContent>
      </Card>
      {/* Skeleton for ClosedEventsCard */}
      <Card>
        <CardHeader className='p-4'>
          <Skeleton className='h-6 w-1/3 rounded' />
        </CardHeader>
        <CardContent className='space-y-3 p-4 pt-0'>
          <Skeleton className='h-12 w-full rounded' />
          <Skeleton className='h-12 w-full rounded' />
        </CardContent>
      </Card>
    </div>
  );
}

export function GroupDetailsSection({
  selectedGroupId,
  selectedGroupDetails,
  selectedGroupEvents,
  userSubmittedTips, // <<--- NEU: Wird hier verwendet
  user,
  isGroupDataLoading,
  groupDataError,
  interactions, // Enthält alle Interaktions-Handler und States
}: GroupDetailsSectionProps) {
  // Fall 1: Keine Gruppe ausgewählt
  if (!selectedGroupId) {
    return (
      <Card className='flex flex-col items-center justify-center py-16 px-4 border-dashed min-h-[400px]'>
        <Users className='h-12 w-12 text-muted-foreground opacity-50 mb-4' />
        <p className='text-muted-foreground text-center'>
          Bitte wähle links eine Gruppe aus, <br /> um Details und Wetten zu
          sehen.
        </p>
      </Card>
    );
  }

  // Fall 2: Gruppe wird geladen
  if (isGroupDataLoading) {
    return <SelectedGroupViewSkeleton />;
  }

  // Fall 3: Fehler beim Laden
  if (groupDataError && !isGroupDataLoading) {
    // Der Button zum erneuten Versuchen benötigt `refreshSelectedGroupData`,
    // das aktuell nicht direkt in `interactions` ist, sondern eine Ebene höher.
    // Fürs Erste auskommentiert gelassen oder du müsstest `refreshSelectedGroupData` auch übergeben.
    return (
      <Card className='border-destructive bg-destructive/10 p-6 shadow-sm flex flex-col items-center text-center min-h-[400px] justify-center'>
        <TriangleAlert className='h-10 w-10 text-destructive mb-3' />
        <p className='text-lg font-medium text-destructive'>
          Fehler beim Laden der Gruppe
        </p>
        <p className='text-sm text-destructive/90 mt-1'>{groupDataError}</p>
      </Card>
    );
  }

  // Fall 4: Daten erfolgreich geladen
  if (selectedGroupDetails && !isGroupDataLoading && !groupDataError) {
    return (
      <SelectedGroupView
        group={selectedGroupDetails}
        events={selectedGroupEvents}
        user={user}
        // Props aus dem interactions-Objekt und userSubmittedTips direkt übergeben
        selectedTips={interactions.selectedTips}
        userSubmittedTips={userSubmittedTips} // <<--- Weitergereicht
        resultInputs={interactions.resultInputs}
        isSubmittingTip={interactions.isSubmittingTip}
        isSettingResult={interactions.isSettingResult}
        onSelectTip={interactions.handleOptionSelect}
        onSubmitTip={interactions.handleSubmitTip}
        onResultInputChange={interactions.handleResultInputChange}
        onSetResult={interactions.handleSetResult} // Signatur von handleSetResult in interactions ist (eventId, winningOption: string)
        isAddEventDialogOpen={interactions.isAddEventDialogOpen}
        onSetAddEventDialogOpen={interactions.setIsAddEventDialogOpen}
        addEventForm={interactions.addEventForm}
        onAddEventSubmit={interactions.handleAddEventSubmit}
        onClearSelectedTip={interactions.handleClearSelectedTip} // <<--- Weitergereicht
        onDeleteGroup={function (group: Group): void {
          throw new Error('Function not implemented.');
        }}
      />
    );
  }

  // Fallback
  return (
    <Card className='flex items-center justify-center py-10 px-4 border-dashed min-h-[400px]'>
      <p className='text-muted-foreground'>
        Inhalt konnte nicht angezeigt werden.
      </p>
    </Card>
  );
}
