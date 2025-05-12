// src/app/components/dashboard/GroupDetailsSection.tsx
'use client';

import type {
  Group,
  Event as GroupEvent,
  UserOut,
  AllTipsPerEvent,
} from '@/app/lib/types'; // NEU: AllTipsPerEvent importieren
import type { UseGroupInteractionsReturn } from '@/app/hooks/useGroupInteractions';

import { Card, CardContent, CardHeader } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Users, TriangleAlert } from 'lucide-react';
import { SelectedGroupView } from '@/app/components/dashboard/SelectedGroupView'; // Annahme: SelectedGroupView ist in diesem Pfad

interface GroupDetailsSectionProps {
  selectedGroupId: number | null; // Kann null sein, wird aber in der Logik behandelt
  selectedGroupDetails: Group | null;
  selectedGroupEvents: GroupEvent[];
  userSubmittedTips: Record<number, string>;
  allTipsPerEvent: AllTipsPerEvent; // NEU: Prop hinzugefügt
  user: UserOut; // User-Objekt wird hier erwartet (nicht null/undefined)
  isGroupDataLoading: boolean;
  groupDataError: string | null | undefined;
  interactions: UseGroupInteractionsReturn;
  onDeleteGroupInPage: (group: Group) => void;
  onImageChanged: () => void;
}

function SelectedGroupViewSkeleton() {
  return (
    <div className='space-y-6'>
      {/* Header Card Skeleton */}
      <Card className='rounded-xl border border-border bg-muted shadow-sm'>
        <CardHeader className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-6'>
          <div className='flex-1 space-y-2'>
            <Skeleton className='h-7 w-1/2 rounded-xl' />
            <Skeleton className='h-4 w-3/4 rounded-xl' />
          </div>
          <div className='flex flex-col sm:flex-row gap-2 flex-shrink-0'>
            <Skeleton className='h-9 w-32 rounded-md' />
            <Skeleton className='h-9 w-32 rounded-md' />
          </div>
        </CardHeader>
      </Card>

      {/* Offene Wetten Skeleton */}
      <Card className='rounded-xl border border-border bg-muted shadow-sm'>
        <CardHeader className='p-6'>
          <Skeleton className='h-6 w-1/3 rounded-xl' />
        </CardHeader>
        <CardContent className='space-y-4 p-6 pt-0'>
          <Skeleton className='h-24 w-full rounded-xl border p-4' />
          <Skeleton className='h-24 w-full rounded-xl border p-4' />
        </CardContent>
      </Card>

      {/* NEU: Submitted Open Events Skeleton (optional, aber konsistent) */}
      <Card className='rounded-xl border border-border bg-muted shadow-sm'>
        <CardHeader className='p-6'>
          <Skeleton className='h-6 w-2/5 rounded-xl' />{' '}
          {/* Angepasste Breite für längeren Titel */}
        </CardHeader>
        <CardContent className='space-y-4 p-6 pt-0'>
          <Skeleton className='h-20 w-full rounded-xl border p-4' />
        </CardContent>
      </Card>

      {/* Geschlossene Events Skeleton */}
      <Card className='rounded-xl border border-border bg-muted shadow-sm'>
        <CardHeader className='p-6'>
          <Skeleton className='h-6 w-1/3 rounded-xl' />
        </CardHeader>
        <CardContent className='space-y-3 p-6 pt-0'>
          <Skeleton className='h-12 w-full rounded-xl' />
          <Skeleton className='h-12 w-full rounded-xl' />
        </CardContent>
      </Card>
    </div>
  );
}

export function GroupDetailsSection({
  selectedGroupId,
  selectedGroupDetails,
  selectedGroupEvents,
  userSubmittedTips,
  allTipsPerEvent, // NEU: Prop empfangen
  user,
  isGroupDataLoading,
  groupDataError,
  interactions,
  onDeleteGroupInPage,
  onImageChanged,
}: GroupDetailsSectionProps) {
  // 1. Keine Gruppe ausgewählt (wird eigentlich schon in DashboardPage behandelt, aber als double check)
  if (!selectedGroupId && !isGroupDataLoading) {
    // Nur anzeigen, wenn nicht gerade geladen wird
    return (
      <Card className='flex flex-col items-center justify-center py-16 px-6 min-h-[400px] border border-dashed border-border bg-muted text-muted-foreground shadow-sm rounded-xl text-center space-y-2'>
        <Users className='h-12 w-12 opacity-50 mb-4' />
        <p>
          Bitte wähle links eine Gruppe aus, <br /> um Details und Wetten zu
          sehen.
        </p>
      </Card>
    );
  }

  // 2. Gruppe wird geladen (oder es gibt noch keine Details, aber eine ID ist ausgewählt)
  if (
    isGroupDataLoading ||
    (selectedGroupId && !selectedGroupDetails && !groupDataError)
  ) {
    return <SelectedGroupViewSkeleton />;
  }

  // 3. Fehler beim Laden
  if (groupDataError && !isGroupDataLoading) {
    return (
      <Card className='p-6 border border-destructive/40 bg-destructive/10 text-destructive shadow-sm rounded-xl flex flex-col items-center text-center min-h-[400px] justify-center space-y-2'>
        <TriangleAlert className='h-10 w-10 mb-3' />
        <p className='text-lg font-medium'>Fehler beim Laden der Gruppe</p>
        <p className='text-sm text-destructive/90'>{groupDataError}</p>
      </Card>
    );
  }

  // 4. Alles geladen und Details vorhanden
  if (selectedGroupDetails && !isGroupDataLoading && !groupDataError) {
    return (
      <SelectedGroupView
        group={selectedGroupDetails}
        events={selectedGroupEvents}
        user={user} // User wird weitergegeben
        interactions={interactions}
        userSubmittedTips={userSubmittedTips}
        allTipsPerEvent={allTipsPerEvent} // NEU: allTipsPerEvent an SelectedGroupView weitergeben
        onDeleteGroup={onDeleteGroupInPage}
        onImageChanged={onImageChanged}
      />
    );
  }

  // 5. Fallback, falls ein unerwarteter Zustand eintritt
  // (sollte idealerweise nicht erreicht werden, wenn die obige Logik greift)
  console.warn(
    '[GroupDetailsSection] Fallback-UI erreicht. Überprüfe Ladezustände und Daten.',
    {
      selectedGroupId,
      selectedGroupDetails,
      isGroupDataLoading,
      groupDataError,
    }
  );
  return (
    <Card className='flex items-center justify-center py-10 px-4 border-dashed min-h-[400px] rounded-xl border-border bg-muted'>
      <p className='text-muted-foreground'>
        Inhalt konnte nicht angezeigt werden. Bitte versuche es später erneut
        oder wähle eine Gruppe aus.
      </p>
    </Card>
  );
}
