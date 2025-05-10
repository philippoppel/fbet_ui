// src/app/components/dashboard/GroupActionsMenu.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/app/components/ui/button';
import {
  Trash2,
  MoreHorizontal,
  Edit3,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import type { Group } from '@/app/lib/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface GroupActionsMenuProps {
  group: Group;
  onDelete: (group: Group) => void;
}

const handlePlaceholderAction = (
  actionName: string,
  groupNameOrId: string | number
) => {
  toast.info(`${actionName} für Gruppe "${groupNameOrId}"`, {
    description: 'Diese Funktion ist noch nicht implementiert.',
    duration: 3000,
  });
};

const LOG_PREFIX_MENU = '[GroupActionsMenu]';

export function GroupActionsMenu({ group, onDelete }: GroupActionsMenuProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeleteActionPending, setIsDeleteActionPending] = useState(false);

  const handleDropdownOpenChange = useCallback(
    (open: boolean) => {
      const groupIdentifier = group.name || group.id;
      console.log(
        `${LOG_PREFIX_MENU} (Gruppe: ${groupIdentifier}) handleDropdownOpenChange - Neuer Zustand: ${open}, isDeleteActionPending: ${isDeleteActionPending}`
      );
      setIsDropdownOpen(open);

      if (!open && isDeleteActionPending) {
        console.log(
          `${LOG_PREFIX_MENU} (Gruppe: ${groupIdentifier}) Dropdown geschlossen, führe ausstehende Löschaktion aus.`
        );
        onDelete(group);
        setIsDeleteActionPending(false);
      }
    },
    [group, onDelete, isDeleteActionPending]
  );

  const handleSelectDeleteAction = useCallback(() => {
    const groupIdentifier = group.name || group.id;
    console.log(
      `${LOG_PREFIX_MENU} (Gruppe: ${groupIdentifier}) handleSelectDeleteAction - "Gruppe löschen" ausgewählt.`
    );
    setIsDeleteActionPending(true);
  }, [group]);

  return (
    <TooltipProvider delayDuration={100}>
      <DropdownMenu
        open={isDropdownOpen}
        onOpenChange={handleDropdownOpenChange}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='p-1 h-7 w-7 text-muted-foreground hover:text-foreground data-[state=open]:bg-white/20 dark:data-[state=open]:bg-white/10 flex-shrink-0 rounded-md'
                aria-label={`Optionen für Gruppe "${group.name || group.id}"`}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
        </Tooltip>
        <DropdownMenuContent
          side='bottom'
          align='end'
          className='w-56 bg-popover text-popover-foreground border-border shadow-md'
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenuLabel className='truncate px-2 py-1.5 text-sm font-semibold'>
            Aktionen für: {group.name || group.id}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className='bg-border/50' />
          <DropdownMenuItem
            className='focus:bg-accent focus:text-accent-foreground text-sm cursor-pointer'
            onSelect={() =>
              handlePlaceholderAction('Name ändern', group.name || group.id)
            }
          >
            <Edit3 className='mr-2 h-4 w-4' />
            Name ändern
          </DropdownMenuItem>
          <DropdownMenuItem
            className='focus:bg-accent focus:text-accent-foreground text-sm cursor-pointer'
            onSelect={() =>
              handlePlaceholderAction(
                'Beschreibung ändern',
                group.name || group.id
              )
            }
          >
            <FileText className='mr-2 h-4 w-4' />
            Beschreibung ändern
          </DropdownMenuItem>
          <DropdownMenuItem
            className='focus:bg-accent focus:text-accent-foreground text-sm cursor-pointer'
            onSelect={() =>
              handlePlaceholderAction(
                'Gruppenbild ändern',
                group.name || group.id
              )
            }
          >
            <ImageIcon className='mr-2 h-4 w-4' />
            Gruppenbild ändern
          </DropdownMenuItem>
          <DropdownMenuSeparator className='bg-border/50' />
          <DropdownMenuItem
            onSelect={handleSelectDeleteAction}
            className='text-destructive focus:bg-destructive/20 focus:text-destructive text-sm cursor-pointer'
          >
            <Trash2 className='mr-2 h-4 w-4' />
            Gruppe löschen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
