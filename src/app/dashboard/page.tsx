// src/app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, LogIn, Users } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { useAuth } from '@/app/context/AuthContext';
import { useDashboardData } from '@/app/hooks/useDashboardData';
import { useGroupInteractions } from '@/app/hooks/useGroupInteractions'; // Importiert
import { AppHeader } from '@/app/components/layout/AppHeader';
import { DashboardLayout } from '@/app/components/dashboard/DashboardLayout';
import { GroupDetailsSection } from '@/app/components/dashboard/GroupDetailsSection';
import { NoGroupsCard } from '@/app/components/dashboard/NoGroupsCard';
import { FullscreenCenter } from '@/app/components/dashboard/FullscreenCenter';
import { deleteGroup as apiDeleteGroup } from '@/app/lib/api';
import type { Group } from '@/app/lib/types';
import { cn } from '@/app/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const {
    user,
    token,
    isLoading: isAuthLoading,
    logout: actualLogoutFunction,
  } = useAuth();

  const {
    myGroups,
    selectedGroupId,
    selectedGroupDetails,
    selectedGroupEvents,
    selectedGroupHighscore,
    selectedGroupMembers,
    userSubmittedTips,
    loadingInitial,
    isGroupDataLoading,
    errors,
    handleSelectGroup,
    refreshSelectedGroupData, // Wird für interactions benötigt
    updateUserTipState, // Wird für interactions benötigt
    refreshMyGroups,
  } = useDashboardData();

  // useGroupInteractions Hook initialisieren
  const interactions = useGroupInteractions({
    token,
    selectedGroupId,
    selectedGroupEvents,
    refreshGroupData: refreshSelectedGroupData, // Korrekt übergeben
    updateUserTipState: updateUserTipState, // Korrekt übergeben
  });

  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] =
    useState(false);
  const [showDeleteGroupDialogFromHeader, setShowDeleteGroupDialogFromHeader] =
    useState(false);
  const [groupToDeleteFromHeader, setGroupToDeleteFromHeader] =
    useState<Group | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !user && !token) {
      router.replace('/login');
    }
  }, [isAuthLoading, user, token, router]);

  const toggleDesktopSidebar = () => {
    setIsDesktopSidebarCollapsed((prev) => !prev);
  };

  const coreDeleteGroupLogic = async (groupIdToDelete: number) => {
    if (!token) {
      toast.error('Fehler', { description: 'Nicht authentifiziert.' });
      throw new Error('Nicht authentifiziert.');
    }
    try {
      await apiDeleteGroup(token, groupIdToDelete);
      if (refreshMyGroups) {
        const refreshedGroups = await refreshMyGroups();
        if (selectedGroupId === groupIdToDelete) {
          if (refreshedGroups.length > 0) {
            handleSelectGroup(refreshedGroups[0].id);
          } else {
            handleSelectGroup(null);
          }
        }
      } else {
        console.warn(
          'refreshMyGroups Funktion nicht im useDashboardData Hook gefunden.'
        );
      }
    } catch (err: any) {
      console.error('Fehler beim Löschen der Gruppe (Kernlogik):', err);
      toast.error('Fehler beim Löschen der Gruppe', {
        description: err.message || 'Ein unbekannter Fehler ist aufgetreten.',
      });
      throw err;
    }
  };

  const handleDeleteGroupFromSidebar = async (groupId: number) => {
    await coreDeleteGroupLogic(groupId);
  };

  const handleInitiateDeleteGroupFromHeader = (group: Group) => {
    setGroupToDeleteFromHeader(group);
    setShowDeleteGroupDialogFromHeader(true);
  };

  const confirmDeleteGroupFromHeader = async () => {
    if (groupToDeleteFromHeader) {
      try {
        await coreDeleteGroupLogic(groupToDeleteFromHeader.id);
        toast.success(
          `Gruppe "${groupToDeleteFromHeader.name || groupToDeleteFromHeader.id}" wurde gelöscht.`
        );
        setGroupToDeleteFromHeader(null);
      } catch (e) {
        console.error('Fehler in confirmDeleteGroupFromHeader abgefangen:', e);
      }
    }
    setShowDeleteGroupDialogFromHeader(false);
  };

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
  if (loadingInitial && (!myGroups || myGroups.length === 0)) {
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
        currentUserId={user?.id}
        onDeleteGroupFromPage={handleDeleteGroupFromSidebar}
      >
        {errors.groups && !loadingInitial ? (
          <div className='p-4 text-center text-destructive'>
            Fehler beim Laden der Gruppen: {errors.groups}
          </div>
        ) : !hasGroups && !loadingInitial ? (
          <NoGroupsCard />
        ) : hasGroups &&
          selectedGroupId === null &&
          !isGroupDataLoading &&
          !loadingInitial ? (
          <div className='flex flex-col items-center justify-center h-full p-8 text-center'>
            <Users className='w-16 h-16 mb-4 text-muted-foreground/50' />
            <h3 className='text-xl font-semibold text-foreground mb-2'>
              Willkommen!
            </h3>
            <p className='text-muted-foreground'>
              Wähle links eine Gruppe aus, um die Details anzuzeigen.
            </p>
          </div>
        ) : hasGroups && selectedGroupId !== null ? (
          <GroupDetailsSection
            key={selectedGroupId}
            selectedGroupId={selectedGroupId}
            selectedGroupDetails={selectedGroupDetails}
            selectedGroupEvents={selectedGroupEvents}
            userSubmittedTips={userSubmittedTips}
            user={user}
            isGroupDataLoading={isGroupDataLoading}
            groupDataError={errors.groupData}
            interactions={interactions} // Das gesamte interactions-Objekt wird übergeben
            // GroupDetailsSection muss interactions.isDeletingSpecificEvent
            // an OpenEventsCard als isDeletingEvent weitergeben.
            onDeleteGroupInPage={handleInitiateDeleteGroupFromHeader}
          />
        ) : null}
      </DashboardLayout>

      {groupToDeleteFromHeader && (
        <AlertDialog
          open={showDeleteGroupDialogFromHeader}
          onOpenChange={setShowDeleteGroupDialogFromHeader}
        >
          <AlertDialogContent
            className={cn(
              'rounded-xl shadow-xl',
              'bg-gradient-to-br from-background/80 via-background/75 to-background/80',
              'dark:from-slate-900/80 dark:via-slate-800/75 dark:to-slate-900/80',
              'backdrop-blur-lg supports-[backdrop-filter]:bg-opacity-75',
              'border border-white/20 dark:border-white/10'
            )}
          >
            <AlertDialogHeader>
              <AlertDialogTitle className='text-foreground'>
                Gruppe "
                {groupToDeleteFromHeader.name || groupToDeleteFromHeader.id}"
                wirklich löschen?
              </AlertDialogTitle>
              <AlertDialogDescription className='text-muted-foreground/90'>
                Diese Aktion kann nicht rückgängig gemacht werden. Alle
                zugehörigen Daten, wie Mitglieder und Veranstaltungen, werden
                ebenfalls dauerhaft entfernt.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setShowDeleteGroupDialogFromHeader(false);
                  setGroupToDeleteFromHeader(null);
                }}
                className={cn(
                  'bg-transparent hover:bg-white/10 dark:hover:bg-black/20',
                  'border border-white/20 dark:border-white/10',
                  'text-foreground'
                )}
              >
                Abbrechen
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteGroupFromHeader}
                className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              >
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
