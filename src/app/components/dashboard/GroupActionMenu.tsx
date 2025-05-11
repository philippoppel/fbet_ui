// src/app/components/dashboard/GroupActionsMenu.tsx
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import {
  Trash2,
  MoreHorizontal,
  Image as ImageIcon,
  PlusCircle,
  Share2,
} from 'lucide-react';
import type { Group } from '@/app/lib/types';
import {
  Tooltip,
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
import { ChangeGroupImageDialog } from './ChangeGroupImageDialog';

interface GroupActionsMenuProps {
  group: Group;
  onDelete: (group: Group) => void;
  onImageChanged: () => void;
  isCreator: boolean;
  onAddEventClick: () => void;
  onInviteClick: () => void;
}

export function GroupActionsMenu({
  group,
  onDelete,
  onImageChanged,
  isCreator,
  onAddEventClick,
  onInviteClick,
}: GroupActionsMenuProps) {
  const router = useRouter();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeletePending, setIsDeletePending] = useState(false);
  const [isImgDialogOpen, setIsImgDialogOpen] = useState(false);

  const handleDropdownOpenChange = useCallback(
    (open: boolean) => {
      setIsDropdownOpen(open);
      if (!open && isDeletePending) {
        onDelete(group);
        setIsDeletePending(false);
      }
    },
    [group, isDeletePending, onDelete]
  );

  const handleSelectDelete = () => setIsDeletePending(true);
  const handleSelectChangeImg = () => {
    setIsImgDialogOpen(true);
    setIsDropdownOpen(false);
  };
  const handleImageChanged = () => router.refresh();

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
                className='p-1 h-7 w-7 text-muted-foreground hover:text-foreground data-[state=open]:bg-white/20 dark:data-[state=open]:bg-white/10'
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
            onSelect={onAddEventClick}
            className='focus:bg-accent focus:text-accent-foreground text-sm cursor-pointer'
          >
            <PlusCircle className='mr-2 h-4 w-4' />
            Event erstellen
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={onInviteClick}
            disabled={!group.inviteToken}
            className='focus:bg-accent focus:text-accent-foreground text-sm cursor-pointer'
          >
            <Share2 className='mr-2 h-4 w-4' />
            Freunde einladen
          </DropdownMenuItem>

          {isCreator && (
            <>
              <DropdownMenuSeparator className='bg-border/50' />

              <DropdownMenuItem
                onSelect={handleSelectChangeImg}
                className='focus:bg-accent focus:text-accent-foreground text-sm cursor-pointer'
              >
                <ImageIcon className='mr-2 h-4 w-4' />
                Gruppenbild ändern
              </DropdownMenuItem>

              <DropdownMenuItem
                onSelect={handleSelectDelete}
                className='text-destructive focus:bg-destructive/20 focus:text-destructive text-sm cursor-pointer'
              >
                <Trash2 className='mr-2 h-4 w-4' />
                Gruppe löschen
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {isImgDialogOpen && (
        <ChangeGroupImageDialog
          groupId={group.id}
          open={isImgDialogOpen}
          setOpen={setIsImgDialogOpen}
          onImageChanged={() => {
            handleImageChanged();
            onImageChanged();
          }}
        />
      )}
    </TooltipProvider>
  );
}
