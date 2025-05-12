'use client';

import { useEffect, useState, useMemo } from 'react';
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
import { useGroupInteractions } from '@/app/hooks/useGroupInteractions';
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
    allTipsPerEvent,
    loadingInitial,
    isGroupDataLoading,
    errors,
    handleSelectGroup,
    refreshSelectedGroupData,
    updateUserTipState,
    refreshMyGroups,
  } = useDashboardData();

  const interactions = useGroupInteractions({
    token,
    selectedGroupId,
    selectedGroupEvents,
    refreshGroupData: refreshSelectedGroupData,
    updateUserTipState,
  });

  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] =
    useState(false);
  const [showDeleteGroupDialogFromHeader, setShowDeleteGroupDialogFromHeader] =
    useState(false);
  const [groupToDeleteFromHeader, setGroupToDeleteFromHeader] =
    useState<Group | null>(null);

  const userTippedEventIds = useMemo(() => {
    return new Set(Object.keys(userSubmittedTips).map(Number));
  }, [userSubmittedTips]);

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
      const refreshedGroups = await refreshMyGroups();
      if (selectedGroupId === groupIdToDelete) {
        handleSelectGroup(refreshedGroups[0]?.id ?? null);
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
        <span className='ml-3 text-lg'>Authentifizierung...</span>
      </FullscreenCenter>
    );
  }

  if (!user || !token) {
    return (
      <FullscreenCenter>
        <div className='text-center'>
          <p className='mb-4'>Bitte einloggen.</p>
          <Button asChild variant='outline'>
            <Link href='/login'>
              <LogIn className='mr-2 h-4 w-4' /> Zum Login
            </Link>
          </Button>
        </div>
      </FullscreenCenter>
    );
  }

  const hasGroups = myGroups.length > 0;

  return (
    <>
      <AppHeader
        user={user}
        onLogout={actualLogoutFunction}
        myGroups={myGroups}
        selectedGroupId={selectedGroupId}
        onSelectGroup={handleSelectGroup}
      />

      {loadingInitial ? (
        <FullscreenCenter>
          <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          <span className='ml-3 text-lg'>Dashboard wird geladen…</span>
        </FullscreenCenter>
      ) : (
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
          currentUserId={user.id}
          onDeleteGroupFromPage={handleDeleteGroupFromSidebar}
        >
          {errors.groups ? (
            <div className='p-4 text-center text-destructive'>
              Fehler: {errors.groups}
            </div>
          ) : !hasGroups ? (
            <NoGroupsCard />
          ) : selectedGroupId === null ? (
            <div className='flex flex-col items-center justify-center h-full p-8 text-center'>
              <Users className='w-16 h-16 mb-4 text-muted-foreground/50' />
              <h3 className='text-xl font-semibold text-foreground mb-2'>
                Willkommen!
              </h3>
              <p className='text-muted-foreground'>Wähle eine Gruppe aus.</p>
            </div>
          ) : (
            <GroupDetailsSection
              key={selectedGroupId}
              selectedGroupId={selectedGroupId}
              selectedGroupDetails={selectedGroupDetails}
              selectedGroupEvents={selectedGroupEvents}
              userSubmittedTips={userSubmittedTips}
              allTipsPerEvent={allTipsPerEvent}
              user={user}
              isGroupDataLoading={isGroupDataLoading}
              groupDataError={
                errors.groupData || errors.userTips || errors.allGroupTips
              }
              interactions={interactions}
              onDeleteGroupInPage={handleInitiateDeleteGroupFromHeader}
              onImageChanged={() => {
                if (selectedGroupId) refreshSelectedGroupData(selectedGroupId);
              }}
            />
          )}
        </DashboardLayout>
      )}

      {groupToDeleteFromHeader && (
        <AlertDialog
          open={showDeleteGroupDialogFromHeader}
          onOpenChange={setShowDeleteGroupDialogFromHeader}
        >
          <AlertDialogContent
            className={cn('rounded-xl shadow-xl bg-background border')}
          >
            <AlertDialogHeader>
              <AlertDialogTitle className='text-foreground'>
                Gruppe &#34;
                {groupToDeleteFromHeader.name || groupToDeleteFromHeader.id}
                &#34; wirklich löschen?
              </AlertDialogTitle>
              <AlertDialogDescription className='text-muted-foreground/90'>
                Diese Aktion kann nicht rückgängig gemacht werden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setShowDeleteGroupDialogFromHeader(false);
                  setGroupToDeleteFromHeader(null);
                }}
              >
                Abbrechen
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteGroupFromHeader}
                className='bg-destructive text-white'
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
