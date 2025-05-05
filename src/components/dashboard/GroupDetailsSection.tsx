// src/components/dashboard/GroupDetailsSection.tsx
import type {
  Group,
  Event as GroupEvent,
  MixedEvent,
  UserOut,
} from '@/lib/types';
import type { UseGroupInteractionsReturn } from '@/hooks/useGroupInteractions';

// UI Components
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { Users, TriangleAlert } from 'lucide-react'; // Import Icons

// Dashboard Specific Components
import { SelectedGroupView } from '@/components/dashboard/SelectedGroupView';
// import { LoaderBlock } from '@/components/dashboard/LoaderBlock'; // Ersetzt durch Skeleton

interface GroupDetailsSectionProps {
  // ... (Props bleiben gleich)
  selectedGroupId: number | null;
  selectedGroupDetails: Group | null;
  selectedGroupEvents: GroupEvent[];
  combinedEvents: MixedEvent[];
  user: UserOut;
  isGroupDataLoading: boolean;
  groupDataError: string | null | undefined;
  interactions: UseGroupInteractionsReturn;
}

// NEU: Skeleton Komponente für den Ladezustand
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
  combinedEvents,
  user,
  isGroupDataLoading,
  groupDataError,
  interactions,
}: GroupDetailsSectionProps) {
  // Fall 1: Keine Gruppe ausgewählt (Verbesserter Empty State)
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

  // Fall 2: Gruppe wird geladen (Verwendet Skeleton)
  if (isGroupDataLoading) {
    return <SelectedGroupViewSkeleton />;
  }

  // Fall 3: Fehler beim Laden (Verbesserter Error State)
  if (groupDataError && !isGroupDataLoading) {
    return (
      <Card className='border-destructive bg-destructive/10 p-6 shadow-sm flex flex-col items-center text-center min-h-[400px] justify-center'>
        <TriangleAlert className='h-10 w-10 text-destructive mb-3' />
        <p className='text-lg font-medium text-destructive'>
          Fehler beim Laden der Gruppe
        </p>
        <p className='text-sm text-destructive/90 mt-1'>{groupDataError}</p>
        {/* Hier könnte ein Retry-Button sinnvoll sein, falls die Funktion existiert */}
        {/* <Button variant="destructive" size="sm" className="mt-4" onClick={interactions.refreshGroupData}>Erneut versuchen</Button> */}
      </Card>
    );
  }

  // Fall 4: Daten erfolgreich geladen
  if (selectedGroupDetails && !isGroupDataLoading && !groupDataError) {
    return (
      <SelectedGroupView
        group={selectedGroupDetails}
        events={selectedGroupEvents}
        combinedEvents={combinedEvents} // Weitergeben, falls benötigt
        user={user}
        // Interaction Props direkt aus dem interactions-Objekt übergeben
        selectedTips={interactions.selectedTips}
        isSubmittingTip={interactions.isSubmittingTip}
        onSelectTip={interactions.handleOptionSelect}
        onSubmitTip={interactions.handleSubmitTip}
        resultInputs={interactions.resultInputs}
        isSettingResult={interactions.isSettingResult}
        onResultInputChange={interactions.handleResultInputChange}
        onSetResult={interactions.handleSetResult}
        isAddEventDialogOpen={interactions.isAddEventDialogOpen}
        onSetAddEventDialogOpen={interactions.setIsAddEventDialogOpen}
        addEventForm={interactions.addEventForm}
        onAddEventSubmit={interactions.handleAddEventSubmit}
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
