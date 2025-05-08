// src/components/dashboard/GroupSidebar.tsx
'use client';

import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import {
  Users,
  PlusCircle,
  Loader2,
  ChevronsLeft,
  ChevronsRight,
  Trash2, // NEU: Icon für Löschen importieren
} from 'lucide-react';
import type { Group } from '@/app/lib/types'; // Stelle sicher, dass Group `createdById` oder `creatorId` enthält
import { cn } from '@/app/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
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
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog';
import { useState } from 'react';

type GroupSidebarProps = {
  groups: Group[];
  selectedGroupId: number | null;
  onSelectGroup: (groupId: number) => void;
  isLoading: boolean;
  error: string | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  currentUserId: number | undefined | null; // NEU: ID des aktuellen Benutzers
  onDeleteGroup: (groupId: number) => Promise<void>; // NEU: Funktion zum Löschen
};

export function GroupSidebar({
  groups,
  selectedGroupId,
  onSelectGroup,
  isLoading,
  error,
  isCollapsed = false,
  onToggleCollapse,
  currentUserId, // NEU
  onDeleteGroup, // NEU
}: GroupSidebarProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);

  const handleDeleteClick = (event: React.MouseEvent, group: Group) => {
    event.stopPropagation(); // Verhindert, dass onSelectGroup ausgelöst wird
    setGroupToDelete(group);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (groupToDelete) {
      await onDeleteGroup(groupToDelete.id);
      setGroupToDelete(null);
    }
    setShowDeleteDialog(false);
  };

  return (
    <TooltipProvider delayDuration={100}>
      <Card
        className={cn(
          'shadow-sm bg-card border border-border flex flex-col h-full transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-full lg:w-[60px]' : 'w-full'
        )}
      >
        <CardHeader
          className={cn(
            'flex flex-row items-center gap-2 px-4 py-3 border-b',
            isCollapsed
              ? 'lg:px-2 lg:py-3 lg:justify-center'
              : 'justify-between'
          )}
        >
          <div
            className={cn(
              'flex items-center gap-2 min-w-0',
              isCollapsed && 'lg:hidden'
            )}
          >
            <Users className='w-5 h-5 text-muted-foreground flex-shrink-0' />
            <CardTitle className='text-lg font-semibold tracking-tight truncate'>
              Meine Gruppen
            </CardTitle>
          </div>
          <div className='flex items-center flex-shrink-0 space-x-1'>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size={isCollapsed ? 'icon' : 'sm'}
                  className={cn(
                    isCollapsed && 'lg:w-8 lg:h-8',
                    !isCollapsed && 'gap-1.5'
                  )}
                  asChild
                  aria-label='Neue Gruppe erstellen'
                >
                  <Link
                    href='/groups/create'
                    className={cn(
                      isCollapsed && 'lg:flex lg:items-center lg:justify-center'
                    )}
                  >
                    <PlusCircle
                      className={cn('w-4 h-4', isCollapsed && 'lg:w-5 lg:h-5')}
                    />
                    <span className={cn(isCollapsed && 'lg:hidden')}>
                      Erstellen
                    </span>
                  </Link>
                </Button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side='right'>
                  <p>Neue Gruppe erstellen</p>
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
                    className='hidden lg:flex w-8 h-8'
                    aria-label='Sidebar einklappen'
                  >
                    <ChevronsLeft className='h-5 w-5' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side='right'>
                  <p>Sidebar einklappen</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </CardHeader>

        <CardContent
          className={cn(
            'flex-1 overflow-y-auto pt-2 pb-4 px-2',
            isCollapsed && 'lg:hidden'
          )}
        >
          {isLoading && (
            <div className='flex items-center justify-center text-sm text-muted-foreground p-4'>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              <span>Gruppen laden...</span>
            </div>
          )}
          {error && (
            <p className='text-sm text-destructive px-2 py-4 text-center'>
              {error}
            </p>
          )}
          {!isLoading && !error && groups.length === 0 && (
            <div className='text-center px-2 py-6 text-muted-foreground text-sm'>
              <Users className='mx-auto h-10 w-10 opacity-50 mb-3' />
              <p className='mb-3'>Du bist noch in keiner Gruppe.</p>
              <Button size='sm' variant='outline' asChild>
                <Link href='/groups/create'>
                  <PlusCircle className='mr-2 h-4 w-4' /> Erste Gruppe erstellen
                </Link>
              </Button>
            </div>
          )}
          {!isLoading && !error && groups.length > 0 && (
            <ul className='space-y-1'>
              {groups.map((group) => {
                // Stelle sicher, dass createdById im group-Objekt vorhanden ist
                // und mit currentUserId verglichen werden kann.
                // Dein Prisma-Schema verwendet `createdById`. Die API (route.ts) gibt `created_by_id` zurück.
                // Entweder du passt den Client-Typ `Group` an, oder du mapps es beim Fetchen der Daten.
                // Ich gehe davon aus, dass dein Client-Typ `Group` die Eigenschaft `createdById` hat.
                if (!group || typeof group.id === 'undefined') return null;

                // Achte darauf, dass `group.createdById` tatsächlich die ID des Erstellers ist.
                // In deinem API-Code (GET /api/groups) verwendest du `created_by_id`.
                // Stelle Konsistenz sicher! Ich nehme an, dein Group-Typ hat `createdById`.
                const isCreator =
                  currentUserId && group.createdById === currentUserId;
                const isSelected = selectedGroupId === group.id;

                return (
                  <li
                    key={group.id}
                    className='flex items-center space-x-1 group/item'
                  >
                    {' '}
                    {/* NEU: group/item für hover */}
                    <Button
                      data-testid={`group-btn-${group.id}`}
                      variant={isSelected ? 'secondary' : 'ghost'}
                      size='sm'
                      className={cn(
                        'flex-grow justify-start text-left h-auto py-1.5 px-2 transition-colors', // NEU: flex-grow
                        !isSelected &&
                          'hover:bg-accent hover:text-accent-foreground',
                        isSelected &&
                          'font-semibold border-l-2 border-primary pl-[calc(0.5rem-2px)]'
                      )}
                      onClick={() => onSelectGroup(group.id)}
                      title={group.name || `Gruppe ${group.id}`}
                    >
                      <span className='truncate'>
                        {group.name || `Gruppe ${group.id}`}
                      </span>
                    </Button>
                    {isCreator &&
                      !isCollapsed && ( // NEU: Zeige Button nur, wenn Admin und nicht collapsed
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='p-1 h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover/item:opacity-100 transition-opacity' // NEU: Styling
                              onClick={(e) => handleDeleteClick(e, group)}
                              aria-label={`Gruppe "${group.name || group.id}" löschen`}
                            >
                              <Trash2 className='h-4 w-4' />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side='right'>
                            <p>Gruppe löschen</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>

        {onToggleCollapse && isCollapsed && (
          <div
            className={cn(
              'hidden lg:flex justify-center items-center py-3 border-t'
            )}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={onToggleCollapse}
                  className='w-8 h-8'
                  aria-label='Sidebar ausklappen'
                >
                  <ChevronsRight className='h-5 w-5' />
                </Button>
              </TooltipTrigger>
              <TooltipContent side='right'>
                <p>Sidebar ausklappen</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </Card>
      {/* NEU: AlertDialog für Löschbestätigung */}
      {groupToDelete && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Gruppe &#34;{groupToDelete.name}&#34; wirklich löschen?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Diese Aktion kann nicht rückgängig gemacht werden. Alle
                zugehörigen Daten, wie Mitglieder und Veranstaltungen, werden
                ebenfalls dauerhaft entfernt.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setGroupToDelete(null)}>
                Abbrechen
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              >
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </TooltipProvider>
  );
}
