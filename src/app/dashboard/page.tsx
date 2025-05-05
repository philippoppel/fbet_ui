// src/app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// import { toast } from 'sonner'; // Nicht verwendet

// Context & Hooks
import { useAuth } from '@/context/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData'; // Annahme: Hook gibt selectedGroupId zurück
import { useGroupInteractions } from '@/hooks/useGroupInteractions';

// UI Components
import { Button } from '@/components/ui/button';
import { Loader2, LogIn } from 'lucide-react';

// Dashboard Specific Components
import { GroupDetailsSection } from '@/components/dashboard/GroupDetailsSection';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { NoGroupsCard } from '@/components/dashboard/NoGroupsCard';
import { FullscreenCenter } from '@/components/dashboard/FullscreenCenter'; // Annahme: existiert

/* =================================================================
––– Haupt-Dashboard-Seite –––
================================================================= */
export default function DashboardPage() {
  const router = useRouter();
  const { user, token, isLoading: isAuthLoading } = useAuth();

  // Data fetching hook
  const {
    myGroups,
    combinedEvents,
    selectedGroupId, // Kommt jetzt vom Hook
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

  // Interactions hook
  const interactions = useGroupInteractions({
    token,
    selectedGroupId,
    selectedGroupEvents,
    refreshGroupData: refreshSelectedGroupData,
  });

  // State für Desktop Sidebar Collapse
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

  // Handler für Mobile Gruppenauswahl
  const handleSelectGroupMobile = (groupId: number) => {
    handleSelectGroup(groupId);
    // Schließen des Sheets wird im Layout gehandhabt
  };

  // --- Loading und Auth-Checks ---
  if (isAuthLoading || (loadingInitial && !user && token)) {
    return (
      <FullscreenCenter>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        <span className='ml-3 text-lg'>Dashboard wird geladen…</span>
      </FullscreenCenter>
    );
  }

  if (!user && !token) {
    // Definitiv nicht eingeloggt
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

  // Wenn User da ist, aber initiale Daten (Gruppen etc.) noch laden
  if (loadingInitial) {
    return (
      <FullscreenCenter>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        <span className='ml-3 text-lg'>Gruppen werden geladen…</span>
      </FullscreenCenter>
    );
  }

  // --- Render Logik ---
  const hasGroups = myGroups && myGroups.length > 0;

  return (
    <DashboardLayout
      // Daten für Sidebars
      myGroups={myGroups}
      selectedGroupId={selectedGroupId}
      selectedGroupHighscore={selectedGroupHighscore}
      selectedGroupMembers={selectedGroupMembers}
      isGroupDataLoading={isGroupDataLoading} // Für rechte Sidebar Loading
      // groupDataError={errors.groupData} // <-- DIESE ZEILE Entfernen (redundant)
      loadingInitial={loadingInitial} // <-- FEHLENDE EIGENSCHAFT HINZUFÜGEN
      errors={errors} // <-- FEHLENDE EIGENSCHAFT HINZUFÜGEN (enthält groups & groupData Fehler)
      // Sidebar-Steuerung und Handler
      isDesktopSidebarCollapsed={isDesktopSidebarCollapsed}
      onToggleCollapse={toggleDesktopSidebar}
      onSelectGroup={handleSelectGroup}
      onSelectGroupMobile={handleSelectGroupMobile}
    >
      {/* Inhalt für die mittlere Spalte */}
      {errors.groups ? ( // Hier wird der Gruppen-Ladefehler behandelt!
        <div className='p-4 text-center text-destructive'>
          Fehler beim Laden der Gruppen: {errors.groups}
        </div>
      ) : !hasGroups ? (
        // Wenn keine Gruppen da sind, zeige die NoGroupsCard
        <NoGroupsCard />
      ) : (
        // Wenn Gruppen da sind, zeige die GroupDetailsSection
        user && ( // Expliziter Check für TypeScript
          <GroupDetailsSection
            key={selectedGroupId} // Key für Reset bei Gruppenwechsel
            selectedGroupId={selectedGroupId}
            selectedGroupDetails={selectedGroupDetails}
            selectedGroupEvents={selectedGroupEvents}
            combinedEvents={combinedEvents} // Durchreichen
            user={user} // User Info übergeben (jetzt sicher nicht null für TS)
            isGroupDataLoading={isGroupDataLoading} // Für Loading/Error/Content Anzeige
            groupDataError={errors.groupData} // Für Loading/Error/Content Anzeige
            interactions={interactions} // Alle Interaktions-Callbacks gebündelt
          />
        )
      )}
    </DashboardLayout>
  );
}
