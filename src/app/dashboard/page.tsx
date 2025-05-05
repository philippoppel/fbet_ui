// src/app/dashboard/page.tsx (oder wo immer deine Seite liegt)
'use client';

import { useEffect, useState, Suspense } from 'react'; // Suspense ggf. nicht mehr direkt hier benötigt
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner'; // Immer noch für Infos gebraucht?

// Context & Hooks
import { useAuth } from '@/context/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useGroupInteractions } from '@/hooks/useGroupInteractions';

// UI Components
import { Button } from '@/components/ui/button';
import { Loader2, LogIn } from 'lucide-react'; // Icons für Lade-/Fehlerzustand

// Dashboard Specific Components (Jetzt hauptsächlich Layout und Inhaltskomponenten)
import { GroupDetailsSection } from '@/components/dashboard/GroupDetailsSection';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { NoGroupsCard } from '@/components/dashboard/NoGroupsCard';
import { FullscreenCenter } from '@/components/dashboard/FullscreenCenter';

// Hilfskomponenten (können in eigene Dateien ausgelagert werden)
// function FullscreenCenter({ children }: { children: React.ReactNode }) { ... }
// function NoGroupsCard() { ... }

/* =================================================================
––– Haupt-Dashboard-Komponente –––
================================================================= */
export default function DashboardPage() {
  const router = useRouter();
  const { user, token, isLoading: isAuthLoading } = useAuth();

  // Data fetching hook
  const {
    myGroups,
    combinedEvents, // Wird ggf. nur noch an GroupDetailsSection -> SelectedGroupView durchgereicht
    selectedGroupId,
    selectedGroupDetails,
    selectedGroupEvents,
    selectedGroupHighscore,
    selectedGroupMembers,
    loadingInitial,
    isGroupDataLoading,
    errors,
    handleSelectGroup, // Wird an Layout für Desktop Sidebar übergeben
    refreshSelectedGroupData,
  } = useDashboardData();

  // Interactions hook
  const interactions = useGroupInteractions({
    token,
    selectedGroupId,
    selectedGroupEvents, // Bleibt wichtig für Context im Hook
    refreshGroupData: refreshSelectedGroupData,
  });

  // State nur noch für Desktop Sidebar Collapse (Sheet State ist jetzt in DashboardLayout)
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] =
    useState(false);

  // Redirect logic
  useEffect(() => {
    if (!isAuthLoading && !user && !token) {
      router.replace('/login');
    }
  }, [isAuthLoading, user, token, router]);

  // Handler für Desktop Sidebar Collapse
  const toggleDesktopSidebar = () => {
    setIsDesktopSidebarCollapsed((prev) => !prev);
  };

  // Handler für Mobile Gruppenauswahl (schließt das Sheet)
  // Dieser wird an DashboardLayout -> Sheet -> GroupSidebar weitergegeben
  // Der Sheet-Schließmechanismus ist nun in DashboardLayout gekapselt
  const handleSelectGroupMobile = (groupId: number) => {
    handleSelectGroup(groupId); // Ruft den normalen Auswahlhandler aus useDashboardData auf
    // Das Schließen des Sheets wird jetzt in DashboardLayout gehandhabt
  };

  // --- Loading und Auth-Checks ---
  if (isAuthLoading || (loadingInitial && !user)) {
    // Zeige Loader, bis Auth-Status klar ist oder initiale Daten (bei eingeloggtem User) geladen sind
    return (
      <FullscreenCenter>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        <span className='ml-3 text-lg'>Dashboard wird geladen…</span>
      </FullscreenCenter>
    );
  }

  if (!user) {
    // Zeige Login-Aufforderung, wenn nicht eingeloggt (nachdem Auth-Check fertig ist)
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

  // --- Render Logik ---
  const hasGroups = myGroups.length > 0;

  return (
    <DashboardLayout
      myGroups={myGroups}
      selectedGroupId={selectedGroupId}
      selectedGroupHighscore={selectedGroupHighscore}
      selectedGroupMembers={selectedGroupMembers}
      isGroupDataLoading={isGroupDataLoading} // Für Highscore-Karte
      groupDataError={errors.groupData} // Für Highscore-Karte Fehlerbehandlung
      loadingInitial={loadingInitial} // Für GroupSidebar Ladezustand
      errors={errors} // Für GroupSidebar Fehler & Highscore Fehler
      isDesktopSidebarCollapsed={isDesktopSidebarCollapsed}
      onToggleCollapse={toggleDesktopSidebar}
      onSelectGroup={handleSelectGroup} // Für Desktop
      onSelectGroupMobile={handleSelectGroupMobile} // Für Mobile (Layout kümmert sich ums Sheet schließen)
    >
      {/* Inhalt für die mittlere Spalte */}
      {!hasGroups ? (
        // Wenn keine Gruppen da sind, zeige die NoGroupsCard
        <NoGroupsCard />
      ) : (
        // Wenn Gruppen da sind, zeige die GroupDetailsSection
        <GroupDetailsSection
          selectedGroupId={selectedGroupId}
          selectedGroupDetails={selectedGroupDetails}
          selectedGroupEvents={selectedGroupEvents}
          combinedEvents={combinedEvents} // Durchreichen
          user={user} // User Info übergeben
          isGroupDataLoading={isGroupDataLoading} // Für Loading/Error/Content Anzeige
          groupDataError={errors.groupData} // Für Loading/Error/Content Anzeige
          interactions={interactions} // Alle Interaktions-Callbacks gebündelt
        />
      )}
    </DashboardLayout>
  );
}
