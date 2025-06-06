// src/app/page.tsx (Deine DashboardPage.tsx)
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
import { deleteGroup as apiDeleteGroup } from '@/app/lib/api';
import type { Group, MixedEvent } from '@/app/lib/types'; // MixedEvent für den Fehler importieren
import { cn } from '@/app/lib/utils';
import { token } from 'stylis';

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
    setSelectedGroupEvents,
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
    // retrievedCombinedEvents, // Wird hier nicht direkt verwendet, aber vom Hook bereitgestellt
    // loadCombinedEvents, // Wird hier nicht direkt verwendet, aber vom Hook bereitgestellt
  } = useDashboardData();

  const interactions = useGroupInteractions({
    token,
    selectedGroupId,
    selectedGroupEvents,
    refreshGroupDataAction: refreshSelectedGroupData,
    updateUserTipStateAction: updateUserTipState,
    setEvents: setSelectedGroupEvents,
  });

  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] =
    useState(false);
  const [showDeleteGroupDialogFromHeader, setShowDeleteGroupDialogFromHeader] =
    useState(false);
  const [groupToDeleteFromHeader, setGroupToDeleteFromHeader] =
    useState<Group | null>(null);

  const [clientRenderComplete, setClientRenderComplete] = useState(false);

  useEffect(() => {
    setClientRenderComplete(true);
  }, []);

  useEffect(() => {
    if (clientRenderComplete && !isAuthLoading && !user && !token) {
      router.replace('/login');
    }
  }, [isAuthLoading, user, token, router, clientRenderComplete]);

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
        // Fehler wird schon in coreDeleteGroupLogic getoastet
      }
    }
    setShowDeleteGroupDialogFromHeader(false);
  };

  // HINWEIS ZUM FEHLER TS2322 (Zeile 291):
  // Der Fehler "Type '(event: UfcEventItem | BoxingScheduleItem) => void' is not assignable to type
  // '(originalEventData: UfcEventItem | BoxingScheduleItem | FootballEvent) => void'"
  // tritt auf, wenn eine Funktion, die nur UfcEventItem oder BoxingScheduleItem erwartet,
  // einer Prop zugewiesen wird, die auch ein FootballEvent übergeben könnte.
  // Du musst die entsprechende Funktion (die um Zeile 291 herum definiert oder verwendet wird,
  // oder eine Funktion, die Teil von `interactions` ist und von einer Kindkomponente aufgerufen wird)
  // so anpassen, dass ihr Parameter den Typ `MixedEvent['original']` oder
  // `UfcEventItem | BoxingScheduleItem | FootballEvent` akzeptiert.
  // Beispiel:
  // const deineEventHandlerFunktion = (event: MixedEvent['original']) => { /* ... Logik ... */ };
  // Und diese Funktion wird dann z.B. an eine Komponente übergeben, die `retrievedCombinedEvents` verarbeitet.
  // Da `retrievedCombinedEvents` hier nicht direkt verwendet wird, ist der Fehler wahrscheinlich
  // tiefer verschachtelt oder in einer Komponente, die `interactions` verwendet.

  if (!clientRenderComplete || isAuthLoading) {
    return (
      <div
        data-testid='initial-loading-div'
        style={{
          minHeight: '100vh',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '20px',
          boxSizing: 'border-box',
          backgroundColor: 'var(--background)',
          color: 'var(--foreground)',
        }}
      >
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        <span className='ml-3 mt-2 text-lg text-muted-foreground'>
          {isAuthLoading
            ? 'Authentifizierung...'
            : 'Seite wird initialisiert...'}
        </span>
        <p
          style={{
            fontSize: '0.7rem',
            marginTop: '10px',
            color: 'var(--muted-foreground)',
          }}
        >
          (Debug: Auth Loading: {isAuthLoading ? 'Ja' : 'Nein'}, Client Render
          Complete: {clientRenderComplete ? 'Ja' : 'Nein'})
        </p>
      </div>
    );
  }

  if (!user || !token) {
    return (
      <div
        data-testid='login-prompt-div'
        style={{
          minHeight: '100vh',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '20px',
          boxSizing: 'border-box',
          backgroundColor: 'var(--background)',
          color: 'var(--foreground)',
        }}
      >
        <p className='mb-4 text-lg'>Bitte einloggen, um fortzufahren.</p>
        <Button asChild variant='outline' size='lg'>
          <Link href='/login'>
            <LogIn className='mr-2 h-5 w-5' /> Zum Login
          </Link>
        </Button>
      </div>
    );
  }

  if (loadingInitial) {
    return (
      <div
        data-testid='dashboard-data-loading-div'
        style={{
          minHeight: '100vh',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '20px',
          boxSizing: 'border-box',
          backgroundColor: 'var(--background)',
          color: 'var(--foreground)',
        }}
      >
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        <span className='ml-3 mt-2 text-lg text-muted-foreground'>
          Dashboard-Daten werden geladen...
        </span>
        <p
          style={{
            fontSize: '0.7rem',
            marginTop: '10px',
            color: 'var(--muted-foreground)',
          }}
        >
          (Debug: loadingInitial: {loadingInitial ? 'Ja' : 'Nein'})
        </p>
      </div>
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
      <DashboardLayout
        myGroups={myGroups}
        selectedGroupId={selectedGroupId}
        selectedGroupDetails={selectedGroupDetails} // Übergeben für groupLeaderId
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
            allTipsPerEvent={allTipsPerEvent} // Sicherstellen, dass diese Prop korrekt von useDashboardData kommt
            highscoreEntries={selectedGroupHighscore}
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
                className='bg-destructive text-white hover:bg-destructive/90'
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
