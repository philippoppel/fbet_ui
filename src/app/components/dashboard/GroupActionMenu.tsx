// src/app/components/dashboard/GroupActionsMenu.tsx
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { Trash2, MoreHorizontal, Image as ImageIcon } from 'lucide-react';
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
}

export function GroupActionsMenu({
  group,
  onDelete,
  onImageChanged,
}: GroupActionsMenuProps) {
  const router = useRouter();

  /* ───────────────────── State ───────────────────── */
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeletePending, setIsDeletePending] = useState(false);
  const [isImgDialogOpen, setIsImgDialogOpen] = useState(false);

  /* ───────────────── Dropdown Handling ───────────── */
  const handleDropdownOpenChange = useCallback(
    (open: boolean) => {
      setIsDropdownOpen(open);

      // Löschaktion erst ausführen, wenn der User das Menü geschlossen hat
      if (!open && isDeletePending) {
        onDelete(group);
        setIsDeletePending(false);
      }
    },
    [group, isDeletePending, onDelete]
  );

  /* ───────────────── Menüaktionen ────────────────── */
  const handleSelectDelete = () => setIsDeletePending(true);

  const handleSelectChangeImg = () => {
    setIsImgDialogOpen(true); // Dialog öffnen
    setIsDropdownOpen(false); // Menü sofort schließen
  };

  /* Callback aus dem Dialog – Seite sofort neu laden */
  const handleImageChanged = () => router.refresh();

  /* ───────────────────────── UI ───────────────────── */
  return (
    <TooltipProvider delayDuration={100}>
      <DropdownMenu
        open={isDropdownOpen}
        onOpenChange={handleDropdownOpenChange}
      >
        {/* Trigger (3 Punkte) */}
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

        {/* Menüinhalt */}
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

          {/* Gruppenbild ändern */}
          <DropdownMenuItem
            onSelect={handleSelectChangeImg}
            className='focus:bg-accent focus:text-accent-foreground text-sm cursor-pointer'
          >
            <ImageIcon className='mr-2 h-4 w-4' />
            Gruppenbild&nbsp;ändern
          </DropdownMenuItem>

          <DropdownMenuSeparator className='bg-border/50' />

          {/* Gruppe löschen */}
          <DropdownMenuItem
            onSelect={handleSelectDelete}
            className='text-destructive focus:bg-destructive/20 focus:text-destructive text-sm cursor-pointer'
          >
            <Trash2 className='mr-2 h-4 w-4' />
            Gruppe&nbsp;löschen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog zum Bild-Upload */}
      {isImgDialogOpen && (
        <ChangeGroupImageDialog
          groupId={group.id}
          open={isImgDialogOpen}
          setOpen={setIsImgDialogOpen}
          onImageChanged={() => {
            handleImageChanged(); // router.refresh()
            onImageChanged(); // 2️⃣  Hook-Refresh
          }}
        />
      )}
    </TooltipProvider>
  );
}
