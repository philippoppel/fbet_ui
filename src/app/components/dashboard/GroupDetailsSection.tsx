'use client';

import type { Group, Event as GroupEvent, UserOut } from '@/app/lib/types';
import type { UseGroupInteractionsReturn } from '@/app/hooks/useGroupInteractions';

import { Card, CardContent, CardHeader } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Users, TriangleAlert } from 'lucide-react';
import { SelectedGroupView } from '@/app/components/dashboard/SelectedGroupView';

interface GroupDetailsSectionProps {
  selectedGroupId: number | null;
  selectedGroupDetails: Group | null;
  selectedGroupEvents: GroupEvent[];
  userSubmittedTips: Record<number, string>;
  user: UserOut;
  isGroupDataLoading: boolean;
  groupDataError: string | null | undefined;
  interactions: UseGroupInteractionsReturn;
  onDeleteGroupInPage: (group: Group) => void;
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
  user,
  isGroupDataLoading,
  groupDataError,
  interactions,
  onDeleteGroupInPage,
}: GroupDetailsSectionProps) {
  // 1. Keine Gruppe ausgewählt
  if (!selectedGroupId) {
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

  // 2. Gruppe wird geladen
  if (isGroupDataLoading) {
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

  // 4. Alles geladen
  if (selectedGroupDetails && !isGroupDataLoading && !groupDataError) {
    return (
      <SelectedGroupView
        group={selectedGroupDetails}
        events={selectedGroupEvents}
        user={user}
        interactions={interactions}
        userSubmittedTips={userSubmittedTips}
        onDeleteGroup={onDeleteGroupInPage}
      />
    );
  }

  // 5. Fallback
  return (
    <Card className='flex items-center justify-center py-10 px-4 border-dashed min-h-[400px] rounded-xl border-border bg-muted'>
      <p className='text-muted-foreground'>
        Inhalt konnte nicht angezeigt werden.
      </p>
    </Card>
  );
}
