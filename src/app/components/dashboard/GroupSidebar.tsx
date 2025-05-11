// src/app/components/dashboard/GroupSidebar.tsx
'use client';

import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import {
  Users,
  PlusCircle,
  Loader2,
  ChevronsLeft,
  ChevronsRight,
  TriangleAlert, // Hinzugefügt für Fehlerzustand
} from 'lucide-react';
import type { Group } from '@/app/lib/types';
import { cn } from '@/app/lib/utils';
import { CardTitle } from '@/app/components/ui/card'; // Wird für den Titel verwendet
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';
// AlertDialog Imports bleiben, falls benötigt, aber nicht direkt im Design angepasst
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from '@/app/components/ui/alert-dialog';
// import { useState, useEffect } from 'react'; // useState, useEffect bleiben für interne Logik
// import { toast } from 'sonner';
// import { GroupActionsMenu } from '@/app/components/dashboard/GroupActionMenu';

type GroupSidebarProps = {
  groups: Group[];
  selectedGroupId: number | null;
  onSelectGroup: (groupId: number) => void;
  isLoading: boolean;
  error: string | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  currentUserId: number | undefined | null;
  onDeleteGroup: (groupId: number) => Promise<void>;
};

export function GroupSidebar({
  groups,
  selectedGroupId,
  onSelectGroup,
  isLoading,
  error,
  isCollapsed = false,
  onToggleCollapse,
  currentUserId,
  // onDeleteGroup, // Behalten, falls noch verwendet
}: GroupSidebarProps) {
  // const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  // const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);

  return (
    <TooltipProvider delayDuration={100}>
      <div
        className={cn(
          'flex flex-col h-full transition-all duration-300 ease-in-out',
          // Angewandtes Kartendesign
          'bg-muted/30 border border-border rounded-xl shadow-sm',
          isCollapsed ? 'w-full lg:w-[72px]' : 'w-full md:w-64 lg:w-72 xl:w-80' // Angepasste Breiten
        )}
      >
        {/* Header - angelehnt an CardHeader */}
        <div
          className={cn(
            'flex flex-row items-center gap-2 px-3 sm:px-4 py-3 border-b border-border',
            isCollapsed
              ? 'lg:px-2.5 lg:py-3 lg:justify-center' // Leicht angepasstes Padding für collapsed
              : 'justify-between'
          )}
        >
          <div
            className={cn(
              'flex items-center gap-2 min-w-0',
              isCollapsed && 'lg:hidden'
            )}
          >
            <Users className='w-5 h-5 text-primary flex-shrink-0' />
            <CardTitle className='text-base sm:text-lg font-semibold tracking-tight truncate text-foreground'>
              Gruppen
            </CardTitle>
          </div>
          <div className='flex items-center flex-shrink-0'>
            {/* Kein space-x-1 mehr, direkter Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size={isCollapsed ? 'icon' : 'sm'}
                  className={cn(
                    'text-muted-foreground hover:text-foreground',
                    isCollapsed
                      ? 'lg:w-9 lg:h-9 p-0'
                      : 'flex items-center gap-1.5 px-2 py-1 h-auto' // Kompaktere Größen
                  )}
                  asChild
                  aria-label='Neue Gruppe erstellen'
                >
                  <Link href='/groups/create'>
                    <PlusCircle
                      className={cn(
                        'w-4 h-4 flex-shrink-0',
                        isCollapsed && 'lg:w-5 lg:h-5'
                      )}
                    />
                    <span
                      className={cn(
                        isCollapsed && 'lg:hidden',
                        'text-xs sm:text-sm'
                      )}
                    >
                      Erstellen
                    </span>
                  </Link>
                </Button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side='right' sideOffset={5}>
                  <p>Neue Gruppe erstellen</p>
                </TooltipContent>
              )}
            </Tooltip>
            {/* Collapse Button für Desktop Ansicht im Header wenn NICHT collapsed */}
            {onToggleCollapse && !isCollapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={onToggleCollapse}
                    className='hidden lg:flex w-9 h-9 text-muted-foreground hover:text-foreground ml-1' // Kleiner Abstand zum Erstellen-Button
                    aria-label='Sidebar einklappen'
                  >
                    <ChevronsLeft className='h-5 w-5' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side='bottom' sideOffset={5}>
                  <p>Einklappen</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Content - angelehnt an CardContent */}
        <div
          className={cn(
            'flex-1 overflow-y-auto', // pt-2 pb-4 entfernt, wird durch innere Elemente oder Padding der Leerzustände gesteuert
            isCollapsed ? 'lg:hidden px-0' : 'py-2 px-2 sm:px-3 space-y-1' // Padding und Space für Gruppenliste
          )}
        >
          {isLoading && (
            <div className='flex flex-col items-center justify-center h-full text-sm text-muted-foreground p-4'>
              <Loader2 className='h-8 w-8 animate-spin mb-3 opacity-50' />
              <span className='text-xs'>Gruppen laden...</span>
            </div>
          )}
          {error && !isLoading && (
            <div className='flex flex-col items-center justify-center h-full text-destructive px-4 text-center py-10'>
              <TriangleAlert className='h-10 w-10 mb-3 opacity-70' />
              <p className='text-sm font-semibold'>Fehler:</p>
              <p className='text-xs text-destructive/80 mt-1'>{error}</p>
            </div>
          )}
          {!isLoading && !error && groups.length === 0 && !isCollapsed && (
            <div className='flex flex-col items-center justify-center h-full text-center px-3 py-6 text-muted-foreground text-sm'>
              <Users className='mx-auto h-12 w-12 opacity-40 mb-4' />
              <p className='mb-1 text-sm'>Du bist noch in keiner Gruppe.</p>
              <p className='text-xs'>
                Erstelle eine neue Gruppe oder lass dich einladen.
              </p>
              {/* Der Button "Erste Gruppe erstellen" wurde entfernt, da der "Erstellen"-Button im Header diese Funktion übernimmt. */}
            </div>
          )}
          {!isLoading &&
            !error &&
            groups &&
            groups.length > 0 &&
            !isCollapsed && (
              <ul className='space-y-0.5'>
                {/* Reduzierter Abstand zwischen Gruppen */}
                {groups.map((group) => {
                  if (!group || typeof group.id === 'undefined') {
                    return null;
                  }
                  // const isCreator = currentUserId != null && group.createdById != null && currentUserId === group.createdById;
                  const isSelected = selectedGroupId === group.id;

                  return (
                    <li key={group.id}>
                      {/* Kein extra Padding/Margin hier, wird vom Button gesteuert */}
                      <Button
                        data-testid={`group-btn-${group.id}`}
                        variant={isSelected ? 'default' : 'ghost'} // Default für selected, ghost für andere
                        size='sm' // Einheitliche Größe
                        className={cn(
                          'w-full justify-start text-left h-auto py-1.5 px-2.5 transition-all duration-150', // Schnellerer Übergang
                          'rounded-md text-sm', // Einheitliche Textgröße
                          isSelected
                            ? 'bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm' // Dunklerer Hintergrund für Selected
                            : 'text-foreground/80 hover:text-foreground hover:bg-muted focus-visible:bg-muted' // Hellerer Hover für nicht ausgewählte
                        )}
                        onClick={() => onSelectGroup(group.id)}
                        title={group.name || `Gruppe ${group.id}`}
                      >
                        <span className='truncate'>
                          {group.name || `Gruppe ${group.id}`}
                        </span>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
        </div>

        {/* Collapse/Expand Toggle im Footer nur für Desktop Ansicht wenn collapsed */}
        {onToggleCollapse && isCollapsed && (
          <div
            className={cn(
              'hidden lg:flex justify-center items-center py-2.5 border-t border-border' // Angepasstes Padding und Standard-Border
            )}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={onToggleCollapse}
                  className='w-9 h-9 text-muted-foreground hover:text-foreground' // Einheitliche Größe
                  aria-label='Sidebar ausklappen'
                >
                  <ChevronsRight className='h-5 w-5' />
                </Button>
              </TooltipTrigger>
              <TooltipContent side='right' sideOffset={5}>
                <p>Ausklappen</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
