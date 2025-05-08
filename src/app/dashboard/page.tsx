// src/app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner'; // Import toast für die Beispielfunktion

import { Loader2, LogIn, Users } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

import { useAuth } from '@/app/context/AuthContext';
import { useDashboardData } from '@/app/hooks/useDashboardData';
import { useGroupInteractions } from '@/app/hooks/useGroupInteractions';

import { AppHeader } from '@/app/components/layout/AppHeader';
import { DashboardLayout } from '@/app/components/dashboard/DashboardLayout';
import { GroupDetailsSection } from '@/app/components/dashboard/GroupDetailsSection';
import { NoGroupsCard } from '@/app/components/dashboard/NoGroupsCard';
import { FullscreenCenter } from '@/app/components/dashboard/FullscreenCenter';
// Import für deleteGroup API-Aufruf, falls noch nicht vorhanden
// import { deleteGroup as apiDeleteGroup } from '@/app/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const {
    user,
    token,
    isLoading: isAuthLoading,
    logout: actualLogoutFunction,
  } = useAuth();

  // DEBUG LOG in DashboardPage
  console.log('[DashboardPage] Auth User Objekt:', user);
  console.log('[DashboardPage] Auth User ID (user?.id):', user?.id);

  const {
    myGroups,
    selectedGroupId,
    selectedGroupDetails,
    selectedGroupEvents,
    selectedGroupHighscore,
    selectedGroupMembers,
    userSubmittedTips,
    loadingInitial, // Wird an DashboardLayout weitergegeben
    isGroupDataLoading,
    errors,
    handleSelectGroup,
    refreshSelectedGroupData,
    updateUserTipState,
  } = useDashboardData();

  const interactions = useGroupInteractions({
    token,
    selectedGroupId,
    selectedGroupEvents,
    refreshGroupData: refreshSelectedGroupData,
    updateUserTipState: updateUserTipState,
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

  // Beispiel für eine handleDeleteGroup Funktion
  // Diese muss noch an Ihre API angebunden werden.
  const handleDeleteGroup = async (groupId: number) => {
    if (!token) {
      toast.error('Fehler', { description: 'Nicht authentifiziert.' });
      return;
    }
    if (
      window.confirm('Sind Sie sicher, dass Sie diese Gruppe löschen möchten?')
    ) {
      try {
        // Hier würden Sie Ihren API-Aufruf zum Löschen der Gruppe machen
        // z.B. await apiDeleteGroup(token, groupId);
        toast.success(
          `Gruppe ${groupId} (Platzhalter) zum Löschen vorgemerkt.`
        );
        // Nach erfolgreichem Löschen: Gruppenliste neu laden oder die gelöschte Gruppe entfernen
        // Dies könnte bedeuten, `useDashboardData` zu erweitern oder eine globale State-Management-Lösung zu verwenden,
        // um `myGroups` zu aktualisieren. Für den Moment ein Soft-Refresh der aktuellen Gruppe,
        // falls es die ausgewählte war, oder ein Neuladen der Gruppenliste.
        if (selectedGroupId === groupId) {
          // Wenn die gelöschte Gruppe die ausgewählte war, Auswahl aufheben
          // und die erste Gruppe der (aktualisierten) Liste auswählen, oder keine
          handleSelectGroup(
            myGroups.length > 1
              ? (myGroups.find((g) => g.id !== groupId)?.id ?? null)
              : null
          );
        }
        // Sie müssen die Gruppenliste aktualisieren, z.B. durch einen erneuten Fetch in useDashboardData
        // Dies ist nur ein Beispiel, Ihre `useDashboardData` Logik muss dies unterstützen.
        // z.B. eine Funktion `refreshMyGroups()` in `useDashboardData` implementieren.
        // Für dieses Beispiel:
        // await refreshSelectedGroupData(selectedGroupId, { keepExistingDetailsWhileRefreshingSubData: true });
        alert(
          `Platzhalter: Gruppe ${groupId} löschen. Implementieren Sie den API-Aufruf und die Aktualisierung der Gruppenliste.`
        );
      } catch (err: any) {
        toast.error('Fehler beim Löschen der Gruppe', {
          description: err.message,
        });
      }
    }
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
  // loadingInitial wird jetzt an DashboardLayout übergeben und dort für die GroupSidebar verwendet
  if (loadingInitial && myGroups.length === 0) {
    // Zeige Fullscreen Loader nur, wenn initial geladen wird UND noch keine Gruppen da sind
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
        loadingInitial={loadingInitial} // Wird an DashboardLayout übergeben
        errors={errors}
        isDesktopSidebarCollapsed={isDesktopSidebarCollapsed}
        onToggleCollapse={toggleDesktopSidebar}
        onSelectGroup={handleSelectGroup}
        currentUserId={user?.id} // <--- HIER WIRD user.id ÜBERGEBEN
        onDeleteGroupFromPage={handleDeleteGroup} // <--- onDeleteGroup Funktion übergeben
      >
        {/* Inhalt der mittleren Spalte */}
        {errors.groups && !loadingInitial ? ( // Zeige Fehler nur, wenn nicht mehr initial geladen wird
          <div className='p-4 text-center text-destructive'>
            Fehler beim Laden der Gruppen: {errors.groups}
          </div>
        ) : !hasGroups && !loadingInitial ? ( // Zeige NoGroupsCard nur, wenn nicht mehr initial geladen wird
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
        ) : hasGroups && selectedGroupId !== null ? ( // Zeige GroupDetailsSection nur, wenn Gruppen vorhanden und eine ausgewählt ist
          <GroupDetailsSection
            key={selectedGroupId} // Wichtig für Remount bei Gruppenwechsel
            selectedGroupId={selectedGroupId}
            selectedGroupDetails={selectedGroupDetails}
            selectedGroupEvents={selectedGroupEvents}
            userSubmittedTips={userSubmittedTips}
            user={user} // User wird hier bereits übergeben
            isGroupDataLoading={isGroupDataLoading}
            groupDataError={errors.groupData}
            interactions={interactions}
          />
        ) : null}
        {/* Wenn loadingInitial noch true ist und keine Gruppen da sind, wird der Fullscreen Loader oben schon angezeigt */}
      </DashboardLayout>
    </>
  );
}
