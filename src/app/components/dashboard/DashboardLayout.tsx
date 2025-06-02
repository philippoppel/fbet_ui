// src/app/components/dashboard/DashboardLayout.tsx
'use client';

import { useMemo } from 'react'; // useMemo importieren
import { cn } from '@/app/lib/utils';
import type { Group, HighscoreEntry, UserOut } from '@/app/lib/types';

import { HighscoreCard } from '@/app/components/dashboard/HighscoreCard';
import { HighscorePlaceholder } from './HighscorePlaceholder';
import { GroupSidebar } from '@/app/components/dashboard/GroupSidebar';
import { Card } from '@/app/components/ui/card';
import { TriangleAlert } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  myGroups: Group[];
  selectedGroupId: number | null;
  selectedGroupDetails: Group | null; // NEU: Hinzugefügt
  selectedGroupHighscore: HighscoreEntry[];
  selectedGroupMembers: UserOut[];
  isGroupDataLoading: boolean;
  loadingInitial: boolean;
  errors: { groups?: string; groupData?: string };
  isDesktopSidebarCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectGroup: (groupId: number) => void;
  currentUserId: number | undefined | null;
  onDeleteGroupFromPage: (groupId: number) => Promise<void>;
}

export function DashboardLayout({
  children,
  myGroups,
  selectedGroupId,
  selectedGroupDetails, // NEU: Empfangen
  selectedGroupHighscore,
  selectedGroupMembers,
  isGroupDataLoading,
  loadingInitial,
  errors,
  isDesktopSidebarCollapsed,
  onToggleCollapse,
  onSelectGroup,
  currentUserId,
  onDeleteGroupFromPage,
}: DashboardLayoutProps) {
  const hasGroups = myGroups && myGroups.length > 0;

  const collapsedSidebarWidthClass = 'lg:w-[72px]';
  const expandedSidebarWidthClass = 'xl:w-80';
  const collapsedPaddingClass = 'lg:pl-[72px]';
  const expandedPaddingClass = 'lg:pl-80';
  const headerHeightClass = 'h-16';
  const sidebarTopOffsetClass = `top-${headerHeightClass.split('-')[1]}`;
  const mainContentMarginTopClass = `mt-${headerHeightClass.split('-')[1]}`;
  const sidebarCalculatedHeightClass = `h-[calc(100vh-4rem)]`; // Annahme: Header ist 4rem hoch

  const groupLeaderIdForSelectedGroup = useMemo(() => {
    // Bevorzuge selectedGroupDetails, da es aktueller sein kann als myGroups
    if (selectedGroupDetails?.createdById) {
      return selectedGroupDetails.createdById;
    }
    // Fallback auf myGroups, falls selectedGroupDetails noch nicht geladen oder null ist
    if (selectedGroupId && myGroups.length > 0) {
      const currentGroup = myGroups.find((g) => g.id === selectedGroupId);
      return currentGroup?.createdById ?? null;
    }
    return null;
  }, [selectedGroupId, myGroups, selectedGroupDetails]);

  return (
    <div data-testid='dashboard-layout' className='relative min-h-screen'>
      {hasGroups && (
        <div
          className={cn(
            'hidden lg:block fixed left-0 z-30',
            'transition-all duration-300 ease-in-out',
            isDesktopSidebarCollapsed
              ? collapsedSidebarWidthClass
              : expandedSidebarWidthClass,
            sidebarTopOffsetClass,
            sidebarCalculatedHeightClass
          )}
        >
          <GroupSidebar
            groups={myGroups}
            selectedGroupId={selectedGroupId}
            onSelectGroup={onSelectGroup}
            isLoading={loadingInitial && myGroups.length === 0}
            error={errors.groups ?? null}
            isCollapsed={isDesktopSidebarCollapsed}
            onToggleCollapse={onToggleCollapse}
            currentUserId={currentUserId}
            onDeleteGroup={onDeleteGroupFromPage}
          />
        </div>
      )}

      <main
        className={cn(
          'container mx-auto px-4 md:px-6 lg:px-8 py-6',
          mainContentMarginTopClass,
          'transition-all duration-300 ease-in-out',
          hasGroups &&
            (isDesktopSidebarCollapsed
              ? collapsedPaddingClass
              : expandedPaddingClass)
        )}
      >
        <div className={cn('grid grid-cols-1 lg:grid-cols-12 gap-6')}>
          <section
            className={cn(
              'col-span-12',
              hasGroups ? 'lg:col-span-8' : 'lg:col-span-12'
            )}
          >
            {children}
          </section>

          {hasGroups && (
            <aside className={cn('col-span-12 lg:col-span-4')}>
              {selectedGroupId && !errors.groupData && !isGroupDataLoading ? (
                <HighscoreCard
                  highscore={selectedGroupHighscore}
                  members={selectedGroupMembers}
                  isLoading={isGroupDataLoading} // Korrigiert: Sollte den aktuellen Ladezustand reflektieren
                  error={null} // Wenn kein Fehler, dann null
                  currentUserId={currentUserId}
                  groupLeaderId={groupLeaderIdForSelectedGroup} // NEU
                />
              ) : selectedGroupId && errors.groupData && !isGroupDataLoading ? (
                <Card className='flex flex-col items-center justify-center h-48 text-center shadow-sm border border-dashed p-4'>
                  <TriangleAlert className='h-8 w-8 text-destructive mb-2' />
                  <p className='text-sm font-semibold text-destructive'>
                    Fehler
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    Rangliste konnte nicht geladen werden.
                  </p>
                </Card>
              ) : isGroupDataLoading && selectedGroupId ? (
                <HighscoreCard
                  highscore={[]}
                  members={[]}
                  isLoading={true}
                  error={null}
                  currentUserId={currentUserId}
                  groupLeaderId={groupLeaderIdForSelectedGroup} // Oder null, wenn noch nicht bekannt
                />
              ) : !selectedGroupId && !loadingInitial ? (
                <HighscorePlaceholder />
              ) : null}
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
