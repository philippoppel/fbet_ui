// src/app/components/dashboard/DashboardLayout.tsx
import { cn } from '@/app/lib/utils';
import type {
  Group,
  HighscoreEntry,
  // GroupMembership, // Nicht mehr direkt als Prop verwendet, stattdessen UserOut[]
  UserOut,
} from '@/app/lib/types';

import { HighscoreCard } from '@/app/components/dashboard/HighscoreCard';
import { HighscorePlaceholder } from './HighscorePlaceholder';
import { GroupSidebar } from '@/app/components/dashboard/GroupSidebar'; // Sicherstellen, dass der Pfad korrekt ist
import { Card } from '@/app/components/ui/card';

interface DashboardLayoutProps {
  children: React.ReactNode;
  myGroups: Group[];
  selectedGroupId: number | null;
  selectedGroupHighscore: HighscoreEntry[];
  selectedGroupMembers: UserOut[];
  isGroupDataLoading: boolean;
  loadingInitial: boolean; // Diese Prop wird von DashboardPage übergeben
  errors: { groups?: string; groupData?: string };
  isDesktopSidebarCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectGroup: (groupId: number) => void;
  currentUserId: number | undefined | null; // <--- NEUE PROP HINZUGEFÜGT
  // onDeleteGroup (für GroupSidebar) sollte auch hierher, wenn es von DashboardPage kommt
  // oder direkt in DashboardPage an eine dort gerenderte GroupSidebar (falls Mobile-Sidebar dort ist)
  // Für die Desktop-Sidebar hier, wird die onDeleteGroup Funktion aus DashboardPage benötigt
  onDeleteGroupFromPage: (groupId: number) => Promise<void>; // Beispiel für eine Umbenennung zur Klarheit
}

export function DashboardLayout({
  children,
  myGroups,
  selectedGroupId,
  selectedGroupHighscore,
  selectedGroupMembers,
  isGroupDataLoading,
  loadingInitial, // Wird jetzt als Prop empfangen
  errors,
  isDesktopSidebarCollapsed,
  onToggleCollapse,
  onSelectGroup,
  currentUserId, // <--- NEUE PROP VERWENDEN
  onDeleteGroupFromPage, // Beispielhafter Name
}: DashboardLayoutProps) {
  const hasGroups = myGroups && myGroups.length > 0;

  // DEBUG LOG in DashboardLayout
  console.log(
    '[DashboardLayout] Props empfangen - currentUserId:',
    currentUserId
  );

  return (
    <div
      data-testid='dashboard-layout'
      className='container mx-auto px-4 md:px-6 lg:px-8 py-6'
    >
      <div className={cn('grid grid-cols-1 lg:grid-cols-12 gap-6')}>
        {/* Desktop Sidebar */}
        {hasGroups && (
          <aside
            className={cn(
              'hidden lg:flex lg:flex-col transition-all duration-300 ease-in-out',
              isDesktopSidebarCollapsed ? 'lg:col-span-1' : 'lg:col-span-3'
            )}
          >
            <GroupSidebar
              groups={myGroups}
              selectedGroupId={selectedGroupId}
              onSelectGroup={onSelectGroup}
              isLoading={loadingInitial && myGroups.length === 0} // Angepasste Logik für isLoading
              error={errors.groups ?? null}
              isCollapsed={isDesktopSidebarCollapsed}
              onToggleCollapse={onToggleCollapse}
              currentUserId={currentUserId} // <--- KORRIGIERT: Prop verwenden
              onDeleteGroup={onDeleteGroupFromPage} // <--- onDeleteGroup Prop weitergeben
            />
          </aside>
        )}

        {/* Middle column */}
        <section
          className={cn(
            'col-span-12',
            hasGroups &&
              (isDesktopSidebarCollapsed ? 'lg:col-span-8' : 'lg:col-span-6'),
            !hasGroups && 'lg:col-span-9 lg:col-start-2' // Wenn keine Gruppen, dann breiter und zentrierter
          )}
        >
          {children}
        </section>

        {/* Right column - Highscore */}
        {hasGroups &&
          selectedGroupId && ( // Zeige Highscore nur wenn eine Gruppe ausgewählt ist
            <aside className={cn('col-span-12', 'lg:col-span-3')}>
              {!errors.groupData ? (
                <HighscoreCard
                  highscore={selectedGroupHighscore}
                  members={selectedGroupMembers}
                  isLoading={isGroupDataLoading}
                  error={null}
                  currentUserId={currentUserId} // <--- currentUserId auch hier übergeben
                />
              ) : (
                <Card className='flex items-center justify-center h-48 text-center shadow-sm border border-dashed'>
                  <p className='text-sm text-muted-foreground p-4'>
                    Gruppendaten konnten nicht geladen werden. <br />
                    Rangliste nicht verfügbar.
                  </p>
                </Card>
              )}
            </aside>
          )}
        {/* Fallback, wenn keine Gruppe ausgewählt ist, aber Gruppen existieren */}
        {hasGroups && !selectedGroupId && !loadingInitial && (
          <aside className={cn('col-span-12', 'lg:col-span-3')}>
            <HighscorePlaceholder />
          </aside>
        )}
      </div>
    </div>
  );
}
