import { cn } from '@/lib/utils';
import type { Group, HighscoreEntry, GroupMembership } from '@/lib/types';

import { HighscoreCard } from '@/components/dashboard/HighscoreCard';
import { HighscorePlaceholder } from './HighscorePlaceholder';
import { GroupSidebar } from '@/components/dashboard/GroupSidebar';
import { Card } from '@/components/ui/card';

interface DashboardLayoutProps {
  children: React.ReactNode;
  myGroups: Group[];
  selectedGroupId: number | null;
  selectedGroupHighscore: HighscoreEntry[];
  selectedGroupMembers: GroupMembership[];
  isGroupDataLoading: boolean;
  loadingInitial: boolean;
  errors: { groups?: string; groupData?: string };
  isDesktopSidebarCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectGroup: (groupId: number) => void;
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
}: DashboardLayoutProps) {
  const hasGroups = myGroups.length > 0;

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
              isLoading={loadingInitial && !hasGroups}
              error={errors.groups ?? null}
              isCollapsed={isDesktopSidebarCollapsed}
              onToggleCollapse={onToggleCollapse}
            />
          </aside>
        )}

        {/* Middle column */}
        <section
          className={cn(
            'col-span-12',
            hasGroups &&
              (isDesktopSidebarCollapsed ? 'lg:col-span-8' : 'lg:col-span-6'),
            !hasGroups && 'lg:col-span-9 lg:col-start-2'
          )}
        >
          {children}
        </section>

        {/* Right column - Highscore */}
        {hasGroups && (
          <aside className={cn('col-span-12', 'lg:col-span-3')}>
            {selectedGroupId && !errors.groupData ? (
              <HighscoreCard
                highscore={selectedGroupHighscore}
                members={selectedGroupMembers}
                isLoading={isGroupDataLoading}
                error={null}
                currentUserId={0}
              />
            ) : !selectedGroupId ? (
              <HighscorePlaceholder />
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
      </div>
    </div>
  );
}
