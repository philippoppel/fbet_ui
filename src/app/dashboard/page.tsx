'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { useAuth } from '@/context/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useGroupInteractions } from '@/hooks/useGroupInteractions';

import { AppHeader } from '@/components/layout/AppHeader';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { GroupDetailsSection } from '@/components/dashboard/GroupDetailsSection';
import { NoGroupsCard } from '@/components/dashboard/NoGroupsCard';
import { FullscreenCenter } from '@/components/dashboard/FullscreenCenter';

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, isLoading: isAuthLoading } = useAuth();

  // Daten-Fetching
  const {
    myGroups,
    combinedEvents,
    selectedGroupId,
    selectedGroupDetails,
    selectedGroupEvents,
    selectedGroupHighscore,
    selectedGroupMembers,
    loadingInitial,
    isGroupDataLoading,
    errors,
    handleSelectGroup,
    refreshSelectedGroupData,
  } = useDashboardData();

  const interactions = useGroupInteractions({
    token,
    selectedGroupId,
    selectedGroupEvents,
    refreshGroupData: refreshSelectedGroupData,
  });

  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] =
    useState(false);

  useEffect(() => {
    if (!isAuthLoading && !user && !token) {
      router.replace('/login');
    }
  }, [isAuthLoading, user, token, router]);

  const toggleDesktopSidebar = () => {
    setIsDesktopSidebarCollapsed((prev) => !prev);
  };

  // --- Loading & Auth Handling ---
  if (isAuthLoading || (loadingInitial && !user && token)) {
    return (
      <FullscreenCenter>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        <span className='ml-3 text-lg'>Dashboard wird geladen…</span>
      </FullscreenCenter>
    );
  }

  if (!user && !token) {
    return (
      <FullscreenCenter>
        <div className='text-center'>
          <p className='mb-4'>Bitte einloggen, um das Dashboard zu sehen.</p>
          <Button asChild variant='outline'>
            <Link href='/login'>
              <LogIn className='mr-2 h-4 w-4' /> Zum Login
            </Link>
          </Button>
        </div>
      </FullscreenCenter>
    );
  }

  const hasGroups = myGroups && myGroups.length > 0;

  return (
    <>
      <AppHeader
        user={user}
        onLogout={() => {
          // Optional: logout-Funktion einbauen
          console.log('Logout clicked');
        }}
        myGroups={myGroups}
        selectedGroupId={selectedGroupId}
        onSelectGroup={handleSelectGroup}
      />

      <DashboardLayout
        myGroups={myGroups}
        selectedGroupId={selectedGroupId}
        selectedGroupHighscore={selectedGroupHighscore}
        selectedGroupMembers={selectedGroupMembers}
        isGroupDataLoading={isGroupDataLoading}
        loadingInitial={loadingInitial}
        errors={errors}
        isDesktopSidebarCollapsed={isDesktopSidebarCollapsed}
        onToggleCollapse={toggleDesktopSidebar}
        onSelectGroup={handleSelectGroup}
      >
        {/* Inhalt der mittleren Spalte */}
        {errors.groups ? (
          <div className='p-4 text-center text-destructive'>
            Fehler beim Laden der Gruppen: {errors.groups}
          </div>
        ) : !hasGroups ? (
          <NoGroupsCard />
        ) : (
          user && (
            <GroupDetailsSection
              key={selectedGroupId}
              selectedGroupId={selectedGroupId}
              selectedGroupDetails={selectedGroupDetails}
              selectedGroupEvents={selectedGroupEvents}
              combinedEvents={combinedEvents}
              user={user}
              isGroupDataLoading={isGroupDataLoading}
              groupDataError={errors.groupData}
              interactions={interactions}
            />
          )
        )}
      </DashboardLayout>
    </>
  );
}
