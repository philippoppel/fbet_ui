// src/app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Loader2, LogIn } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

import { useAuth } from '@/app/context/AuthContext';
import { useDashboardData } from '@/app/hooks/useDashboardData';
import { useGroupInteractions } from '@/app/hooks/useGroupInteractions';

import { AppHeader } from '@/app/components/layout/AppHeader';
import { DashboardLayout } from '@/app/components/dashboard/DashboardLayout';
import { GroupDetailsSection } from '@/app/components/dashboard/GroupDetailsSection';
import { NoGroupsCard } from '@/app/components/dashboard/NoGroupsCard';
import { FullscreenCenter } from '@/app/components/dashboard/FullscreenCenter';

export default function DashboardPage() {
  const router = useRouter();
  const {
    user,
    token,
    isLoading: isAuthLoading,
    logout: actualLogoutFunction,
  } = useAuth();

  // Hole alle Daten und Funktionen aus useDashboardData
  const {
    myGroups,
    selectedGroupId,
    selectedGroupDetails,
    selectedGroupEvents,
    selectedGroupHighscore,
    selectedGroupMembers,
    userSubmittedTips, // Der State mit den gespeicherten Tipps
    loadingInitial,
    isGroupDataLoading,
    errors,
    handleSelectGroup,
    refreshSelectedGroupData, // Wird für andere Interaktionen gebraucht
    updateUserTipState, // <<--- Die neue Funktion für Tipp-Updates
  } = useDashboardData();

  // Initialisiere useGroupInteractions und übergebe die notwendigen Funktionen
  const interactions = useGroupInteractions({
    token,
    selectedGroupId,
    selectedGroupEvents,
    refreshGroupData: refreshSelectedGroupData, // Für Event-Erstellung/Ergebnis
    updateUserTipState: updateUserTipState, // <<--- Für Tipp-Updates
  });

  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] =
    useState(false);

  // Effekt für die Weiterleitung, falls nicht eingeloggt (unverändert)
  useEffect(() => {
    if (!isAuthLoading && !user && !token) {
      router.replace('/login');
    }
  }, [isAuthLoading, user, token, router]);

  const toggleDesktopSidebar = () => {
    setIsDesktopSidebarCollapsed((prev) => !prev);
  };

  // --- Loading & Auth Handling (unverändert) ---
  if (isAuthLoading) {
    return (
      <FullscreenCenter>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        <span className='ml-3 text-lg'>Authentifizierung wird geprüft…</span>
      </FullscreenCenter>
    );
  }
  if (!user || !token) {
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
  if (loadingInitial) {
    return (
      <FullscreenCenter>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        <span className='ml-3 text-lg'>Dashboard wird geladen…</span>
      </FullscreenCenter>
    );
  }

  const hasGroups = myGroups && myGroups.length > 0;

  const handleLogout = () => {
    actualLogoutFunction();
  };

  return (
    <>
      <AppHeader
        user={user}
        onLogout={handleLogout}
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
          <GroupDetailsSection
            key={selectedGroupId}
            selectedGroupId={selectedGroupId}
            selectedGroupDetails={selectedGroupDetails}
            selectedGroupEvents={selectedGroupEvents}
            userSubmittedTips={userSubmittedTips} // <<--- Wird weitergegeben
            user={user}
            isGroupDataLoading={isGroupDataLoading}
            groupDataError={errors.groupData}
            interactions={interactions} // Enthält jetzt updateUserTipState indirekt
          />
        )}
      </DashboardLayout>
    </>
  );
}
