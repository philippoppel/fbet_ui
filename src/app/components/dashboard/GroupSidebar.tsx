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
  // Icons, die nur im Menü gebraucht wurden, sind hier entfernt
} from 'lucide-react';
import type { Group } from '@/app/lib/types';
import { cn } from '@/app/lib/utils';
import { CardTitle } from '@/app/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';
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
// DropdownMenu Imports sind hier nicht mehr nötig
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { GroupActionsMenu } from '@/app/components/dashboard/GroupActionMenu';

type GroupSidebarProps = {
  groups: Group[];
  selectedGroupId: number | null;
  onSelectGroup: (groupId: number) => void;
  isLoading: boolean;
  error: string | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  currentUserId: number | undefined | null;
  onDeleteGroup: (groupId: number) => Promise<void>; // Diese Prop wird an GroupActionsMenu weitergegeben
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
  onDeleteGroup, // Wird nun für den Callback in GroupActionsMenu verwendet
}: GroupSidebarProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);

  // --- DEBUG LOGS (können später entfernt werden) ---
  useEffect(() => {
    console.log(
      '%c[GroupSidebar DEBUG] Component Props:',
      'color: blue; font-weight: bold;'
    );
    console.log(
      `[GroupSidebar DEBUG] currentUserId:`,
      currentUserId,
      `(Typ: ${typeof currentUserId})`
    );
    console.log(
      `[GroupSidebar DEBUG] isCollapsed:`,
      isCollapsed,
      `(Typ: ${typeof isCollapsed})`
    );
    // ... (restliche Logs können bleiben oder entfernt werden) ...
    console.log('%c------------------------------------', 'color: blue;');
  }, [currentUserId, isCollapsed, groups, isLoading, error]);

  // Diese Funktion wird als Prop an GroupActionsMenu übergeben
  const handleDeleteInitiated = (group: Group) => {
    console.log(
      '[GroupSidebar] handleDeleteInitiated called for group:',
      group.id
    );
    setGroupToDelete(group);
    setShowDeleteDialog(true);
  };

  // Diese Funktion wird vom AlertDialog aufgerufen
  const confirmDelete = async () => {
    if (groupToDelete) {
      try {
        await onDeleteGroup(groupToDelete.id); // Die eigentliche Löschlogik (API-Call etc.)
        toast.success(
          `Gruppe "${groupToDelete.name || groupToDelete.id}" wurde gelöscht.`
        );
        setGroupToDelete(null);
      } catch (e: any) {
        toast.error('Fehler beim Löschen der Gruppe', {
          description: e.message,
        });
      }
    }
    setShowDeleteDialog(false);
  };

  // Nicht mehr nötig, da in GroupActionsMenu
  // const handlePlaceholderAction = (...) => { ... };

  return (
    // Der äußere TooltipProvider ist hier korrekt, da er alle Tooltips in der Sidebar abdeckt
    <TooltipProvider delayDuration={100}>
      {/* Container mit angepasstem Design */}
      <div
        className={cn(
          'flex flex-col h-full transition-all duration-300 ease-in-out',
          'bg-background/70 dark:bg-slate-900/60 backdrop-blur-lg supports-[backdrop-filter]:bg-background/70',
          'border border-white/10 dark:border-white/5 rounded-lg shadow-md',
          isCollapsed ? 'w-full lg:w-[60px]' : 'w-full'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex flex-row items-center gap-2 px-4 py-3 border-b border-white/10 dark:border-white/5',
            isCollapsed
              ? 'lg:px-2 lg:py-3 lg:justify-center'
              : 'justify-between'
          )}
        >
          {/* ... Header Inhalt (unverändert) ... */}
          <div
            className={cn(
              'flex items-center gap-2 min-w-0',
              isCollapsed && 'lg:hidden'
            )}
          >
            <Users className='w-5 h-5 text-muted-foreground flex-shrink-0' />
            <CardTitle className='text-lg font-semibold tracking-tight truncate text-foreground'>
              Meine Gruppen
            </CardTitle>
          </div>
          <div className='flex items-center flex-shrink-0 space-x-1'>
            {/* ... Erstellen Button / Collapse Button ... */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size={isCollapsed ? 'icon' : 'sm'}
                  className={cn(
                    'text-muted-foreground hover:text-foreground',
                    isCollapsed && 'lg:w-8 lg:h-8',
                    !isCollapsed && 'flex items-center gap-1.5'
                  )}
                  asChild
                  aria-label='Neue Gruppe erstellen'
                >
                  <Link href='/dashboard/groups/create'>
                    <PlusCircle
                      className={cn(
                        'w-4 h-4 flex-shrink-0',
                        isCollapsed && 'lg:w-5 lg:h-5'
                      )}
                    />
                    <span className={cn(isCollapsed && 'lg:hidden')}>
                      {' '}
                      Erstellen{' '}
                    </span>
                  </Link>
                </Button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent
                  side='right'
                  sideOffset={5}
                  className='bg-popover text-popover-foreground border-border'
                >
                  {' '}
                  <p>Neue Gruppe erstellen</p>{' '}
                </TooltipContent>
              )}
            </Tooltip>
            {onToggleCollapse && !isCollapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={onToggleCollapse}
                    className='hidden lg:flex w-8 h-8 text-muted-foreground hover:text-foreground'
                    aria-label='Sidebar einklappen'
                  >
                    <ChevronsLeft className='h-5 w-5' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  side='right'
                  sideOffset={5}
                  className='bg-popover text-popover-foreground border-border'
                >
                  {' '}
                  <p>Sidebar einklappen</p>{' '}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Content (Gruppenliste) */}
        <div
          className={cn(
            'flex-1 overflow-y-auto pt-2 pb-4',
            isCollapsed ? 'lg:hidden px-0' : 'px-3'
          )}
        >
          {/* ... isLoading, error, no groups states (unverändert) ... */}
          {isLoading && (
            <div className='flex items-center justify-center text-sm text-muted-foreground p-4'>
              {' '}
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />{' '}
              <span>Gruppen laden...</span>{' '}
            </div>
          )}
          {error && (
            <p className='text-sm text-destructive px-2 py-4 text-center'>
              {' '}
              {error}{' '}
            </p>
          )}
          {!isLoading && !error && groups.length === 0 && !isCollapsed && (
            <div className='text-center px-2 py-6 text-muted-foreground text-sm'>
              {' '}
              <Users className='mx-auto h-10 w-10 opacity-50 mb-3' />{' '}
              <p className='mb-3'>Du bist noch in keiner Gruppe.</p>{' '}
              <Button
                size='sm'
                variant='outline'
                className='border-border hover:bg-accent'
                asChild
              >
                {' '}
                <Link href='/dashboard/groups/create'>
                  {' '}
                  <PlusCircle className='mr-2 h-4 w-4' /> Erste Gruppe
                  erstellen{' '}
                </Link>{' '}
              </Button>{' '}
            </div>
          )}

          {!isLoading &&
            !error &&
            groups &&
            groups.length > 0 &&
            !isCollapsed && (
              <ul className='space-y-1'>
                {groups.map((group, index) => {
                  // ... Debug Logs können hier bleiben für's Erste ...
                  if (index === 0) {
                    console.log(
                      '%c[GroupSidebar DEBUG] Processing first group in map:',
                      'color: green; font-weight: bold;'
                    );
                    console.log(
                      `[GroupSidebar DEBUG] Group ID: ${group?.id}, Name: "${group?.name}"`
                    );
                    console.log(
                      `[GroupSidebar DEBUG] Group createdById:`,
                      group?.createdById,
                      `(Typ: ${typeof group?.createdById})`
                    );
                    console.log(
                      `[GroupSidebar DEBUG] currentUserId (for comparison):`,
                      currentUserId,
                      `(Typ: ${typeof currentUserId})`
                    );
                  }

                  if (!group || typeof group.id === 'undefined') {
                    console.warn(
                      '[GroupSidebar DEBUG] Ungültiges Gruppenobjekt im Mapping übersprungen:',
                      group
                    );
                    return null;
                  }

                  const isCreator =
                    currentUserId != null &&
                    group.createdById != null &&
                    currentUserId === group.createdById;

                  if (index === 0) {
                    console.log(
                      `[GroupSidebar DEBUG] isCreator (first group):`,
                      isCreator
                    );
                    console.log(
                      '%c------------------------------------',
                      'color: green;'
                    );
                  }

                  const isSelected = selectedGroupId === group.id;

                  return (
                    <li
                      key={group.id}
                      className={cn(
                        'flex items-center space-x-1.5 rounded-md px-1',
                        !isSelected &&
                          'hover:bg-white/10 dark:hover:bg-white/5 focus-within:bg-white/10 dark:focus-within:bg-white/5'
                      )}
                    >
                      <Button
                        data-testid={`group-btn-${group.id}`}
                        variant={'ghost'}
                        size='sm'
                        className={cn(
                          'flex-grow justify-start text-left h-auto py-1.5 px-2 transition-colors w-auto truncate',
                          'rounded-md',
                          isSelected
                            ? 'bg-primary/80 hover:bg-primary text-primary-foreground font-semibold'
                            : 'text-foreground/90 hover:text-foreground hover:bg-transparent'
                        )}
                        onClick={() => onSelectGroup(group.id)}
                        title={group.name || `Gruppe ${group.id}`}
                      >
                        {group.name || `Gruppe ${group.id}`}
                      </Button>

                      {/* Hier wird die neue Komponente verwendet */}
                      {isCreator && !isCollapsed && (
                        <GroupActionsMenu
                          group={group}
                          onDelete={handleDeleteInitiated} // Übergibt die Funktion zum Öffnen des Dialogs
                          // Später hier weitere Props hinzufügen:
                          // onRename={handleRenameInitiated}
                          // onEditDescription={handleEditDescriptionInitiated}
                          // onChangeImage={handleChangeImageInitiated}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
        </div>

        {/* Collapse/Expand Toggle */}
        {onToggleCollapse && isCollapsed && (
          <div
            className={cn(
              'hidden lg:flex justify-center items-center py-3 border-t border-white/10 dark:border-white/5'
            )}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={onToggleCollapse}
                  className='w-8 h-8 text-muted-foreground hover:text-foreground'
                  aria-label='Sidebar ausklappen'
                >
                  <ChevronsRight className='h-5 w-5' />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side='right'
                sideOffset={5}
                className='bg-popover text-popover-foreground border-border'
              >
                {' '}
                <p>Sidebar ausklappen</p>{' '}
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {/* AlertDialog für Löschbestätigung (bleibt hier) */}
      {groupToDelete && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className='bg-background border-border shadow-lg'>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {' '}
                Gruppe &#34;{groupToDelete.name || groupToDelete.id}&#34;
                wirklich löschen?{' '}
              </AlertDialogTitle>
              <AlertDialogDescription className='text-muted-foreground'>
                {' '}
                Diese Aktion kann nicht rückgängig gemacht werden. Alle
                zugehörigen Daten, wie Mitglieder und Veranstaltungen, werden
                ebenfalls dauerhaft entfernt.{' '}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                className='border-border hover:bg-accent'
                onClick={() => {
                  setGroupToDelete(null);
                  setShowDeleteDialog(false);
                }}
              >
                {' '}
                Abbrechen{' '}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              >
                {' '}
                Löschen{' '}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </TooltipProvider>
  );
}
