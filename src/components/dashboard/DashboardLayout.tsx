// src/components/dashboard/DashboardLayout.tsx
import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Group, HighscoreEntry, GroupMembership } from '@/lib/types'; // Import necessary types

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Keep Card for Placeholders
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

// Icons
import { Menu, ShieldPlus, Users, LogIn, PlusCircle } from 'lucide-react'; // Import necessary icons

// Dashboard Specific Components
import { GroupSidebar } from '@/components/dashboard/GroupSidebar';
import { HighscoreCard } from '@/components/dashboard/HighscoreCard';
import { HighscorePlaceholder } from './HighscorePlaceholder';

interface DashboardLayoutProps {
  children: React.ReactNode; // Content for the middle column
  myGroups: Group[];
  selectedGroupId: number | null;
  selectedGroupHighscore: HighscoreEntry[];
  selectedGroupMembers: GroupMembership[];
  isGroupDataLoading: boolean; // For HighscoreCard loading state
  groupDataError?: string | null; // For checking if Highscore should render
  loadingInitial: boolean; // For initial group loading state
  errors: { groups?: string; groupData?: string }; // Specific errors
  isDesktopSidebarCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectGroup: (groupId: number) => void; // For Desktop Sidebar
  onSelectGroupMobile: (groupId: number) => void; // For Mobile Sheet
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
  onSelectGroupMobile,
}: DashboardLayoutProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const hasGroups = myGroups.length > 0;

  const handleSelectAndClose = (groupId: number) => {
    onSelectGroupMobile(groupId); // Call the original mobile handler
    setIsSheetOpen(false); // Close the sheet
  };

  return (
    // Container umschließt das gesamte Layout für konsistente Abstände
    <div
      data-testid='dashboard-layout'
      className='container mx-auto px-4 md:px-6 lg:px-8 py-6'
    >
      {/* --- Mobile Sheet Trigger (Nur unter lg und wenn Gruppen vorhanden) --- */}
      {hasGroups && (
        <div className='mb-4 lg:hidden'>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant='outline'
                size='icon'
                aria-label='Gruppen anzeigen'
              >
                <Menu className='h-5 w-5' />
              </Button>
            </SheetTrigger>
            <SheetContent
              side='left'
              className='w-[280px] sm:w-[320px] p-0 flex flex-col'
            >
              <SheetHeader className='p-4 border-b'>
                <SheetTitle className='flex items-center gap-2 text-base font-semibold'>
                  <Users className='w-5 h-5 text-muted-foreground' /> Meine
                  Gruppen
                </SheetTitle>
              </SheetHeader>
              <div className='flex-1 overflow-y-auto p-4'>
                {/* GroupSidebar im Sheet */}
                <GroupSidebar
                  groups={myGroups}
                  selectedGroupId={selectedGroupId}
                  onSelectGroup={handleSelectAndClose} // Handler zum Schließen verwenden
                  isLoading={false} // Sheet wird nur angezeigt, wenn Gruppen da sind
                  error={errors.groups ?? null}
                  isCollapsed={false} // Sheet ist nie collapsed
                  // onToggleCollapse nicht benötigt im Sheet
                />
              </div>
              {/* Footer im Sheet */}
              <div className='p-4 border-t mt-auto bg-background'>
                {' '}
                {/* Wichtig: mt-auto und bg-background */}
                <Button size='sm' variant='ghost' asChild>
                  <Link href='/groups/create'>
                    <PlusCircle className='w-4 h-4' /> Gruppe erstellen
                  </Link>
                </Button>
                {/* Optionaler "Beitreten"-Button im Footer */}
                {/* <Button
variant='outline'
size='sm'
className='w-full mt-2 gap-1.5'
onClick={() => toast.info('Beitreten über geteilte Links.')}
>
<LogIn className='w-4 h-4' /> Beitreten (Info)
</Button> */}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}

      {/* --- Haupt-Grid (Immer vorhanden, passt sich an) --- */}
      <div
        className={cn(
          'grid grid-cols-1 lg:grid-cols-12 gap-6' // Basis-Grid
        )}
      >
        {/* ––––– Sidebar (Desktop) ––––– */}
        {hasGroups && (
          <aside
            className={cn(
              'hidden lg:flex lg:flex-col transition-all duration-300 ease-in-out', // Grundlegende Desktop-Sidebar-Styles
              isDesktopSidebarCollapsed ? 'lg:col-span-1' : 'lg:col-span-3' // Breite anpassen
            )}
          >
            {/* GroupSidebar für Desktop */}
            <GroupSidebar
              groups={myGroups}
              selectedGroupId={selectedGroupId}
              onSelectGroup={onSelectGroup} // Normaler Select-Handler
              isLoading={loadingInitial && !hasGroups} // Nur initial anzeigen, wenn keine Gruppen geladen
              error={errors.groups ?? null}
              isCollapsed={isDesktopSidebarCollapsed}
              onToggleCollapse={onToggleCollapse}
            />
          </aside>
        )}

        {/* ––––– Mittelspalte (Inhalt) ––––– */}
        <section
          className={cn(
            'col-span-12', // Nimmt immer volle Breite auf Mobile ein
            // Passt Spaltenbreite auf Desktop an Sidebar an
            hasGroups &&
              (isDesktopSidebarCollapsed ? 'lg:col-span-8' : 'lg:col-span-6'),
            // Zentriert und breiter, wenn keine Gruppen/Sidebar da sind
            !hasGroups && 'lg:col-span-9 lg:col-start-2' // Beispiel: Zentrierter, etwas breiterer Inhalt
          )}
        >
          {children} {/* Hier wird der Inhalt von DashboardPage eingefügt */}
        </section>

        {/* ––––– Rechte Spalte (Highscore) ––––– */}
        {hasGroups && (
          <aside
            className={cn(
              'col-span-12', // Volle Breite auf Mobile
              // Feste Breite auf Desktop, passt sich *nicht* an Sidebar an
              isDesktopSidebarCollapsed ? 'lg:col-span-3' : 'lg:col-span-3' // Bleibt bei col-span-3
            )}
          >
            {/* Logik für Highscore bleibt hier */}
            {selectedGroupId && !errors.groupData ? (
              <HighscoreCard
                highscore={selectedGroupHighscore}
                members={selectedGroupMembers}
                isLoading={isGroupDataLoading} // Verwende isGroupDataLoading für die Karte
                error={null} // Fehler wird zentraler behandelt oder hier nochmal prüfen?
                currentUserId={0}
              />
            ) : !selectedGroupId ? (
              <HighscorePlaceholder /> // Placeholder, wenn keine Gruppe gewählt
            ) : (
              <Card className='flex items-center justify-center h-48 text-center shadow-sm border border-dashed'>
                <p className='text-sm text-muted-foreground p-4'>
                  Gruppendaten konnten nicht geladen werden. <br />
                  Rangliste nicht verfügbar.
                </p>
              </Card> // Optional: Eigener Zustand bei Fehler
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

// Optional: Extrahiere auch die Platzhalter in eigene kleine Komponenten,
// falls sie wiederverwendet werden oder komplexer sind.
// z.B.: src/components/dashboard/HighscorePlaceholder.tsx
// export function HighscorePlaceholder() { ... }
