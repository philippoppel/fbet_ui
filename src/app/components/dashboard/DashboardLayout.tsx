// src/app/components/dashboard/DashboardLayout.tsx
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

  // Sidebar-Breiten (aus GroupSidebar.tsx)
  const collapsedSidebarWidthClass = 'lg:w-[72px]'; // ca. 4.5rem
  // Annahme: xl:w-80 ist die breiteste Einstellung (20rem / 320px)
  const expandedSidebarWidthClass = 'xl:w-80';

  // Entsprechende Padding-Klassen für den Hauptinhalt
  const collapsedPaddingClass = 'lg:pl-[72px]';
  const expandedPaddingClass = 'lg:pl-80'; // Entspricht pl-20rem

  // Annahme: Dein AppHeader ist fixiert und hat eine Höhe von h-16 (4rem / 64px)
  const headerHeightClass = 'h-16'; // Anpassen, falls dein Header anders ist
  const sidebarTopOffsetClass = `top-${headerHeightClass.split('-')[1]}`; // ergibt 'top-16'
  const mainContentMarginTopClass = `mt-${headerHeightClass.split('-')[1]}`; // ergibt 'mt-16'
  const sidebarCalculatedHeightClass = `h-[calc(100vh-${headerHeightClass.split('-')[1] === '16' ? '4rem' : 'DEINE_HEADER_HOEHE_IN_REM'})]`;
  // Vereinfacht, wenn du die rem-Höhe direkt kennst:
  // const sidebarCalculatedHeightClass = 'h-[calc(100vh-4rem)]'; // Wenn Header 4rem hoch

  return (
    <div data-testid='dashboard-layout' className='relative min-h-screen'>
      {/* Desktop Sidebar - bleibt wie zuvor */}
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

      {/* Hauptinhaltsbereich */}
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
          {/* Mittlere Spalte: Hauptinhalt (children) */}
          <section
            className={cn(
              'col-span-12',
              // NEU: Wenn Gruppen vorhanden, nimmt Hauptinhalt 8 Spalten, sonst 12
              hasGroups ? 'lg:col-span-8' : 'lg:col-span-12' // War vorher lg:col-span-9
            )}
          >
            {children}
          </section>

          {/* Rechte Spalte: Highscore */}
          {hasGroups && (
            <aside className={cn('col-span-12 lg:col-span-4')}>
              {/* NEU: War vorher lg:col-span-3 */}
              {/* Logik zur Anzeige von HighscoreCard, Placeholder oder Fehler bleibt gleich */}
              {selectedGroupId && !errors.groupData && !isGroupDataLoading ? (
                <HighscoreCard
                  highscore={selectedGroupHighscore}
                  members={selectedGroupMembers}
                  isLoading={isGroupDataLoading}
                  error={null}
                  currentUserId={currentUserId}
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
