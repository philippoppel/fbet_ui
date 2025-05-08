// src/app/components/dashboard/GroupActionsMenu.tsx
'use client';

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
  TooltipProvider, // Provider hier für den Fall, dass die Komponente isoliert verwendet wird
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

// Definiert die Props, die die Komponente benötigt
interface GroupActionsMenuProps {
  group: Group;
  onDelete: (group: Group) => void; // Callback, um den Löschvorgang im Parent zu starten
  // Zukünftige Props für andere Aktionen könnten hier hinzugefügt werden:
  // onRename?: (group: Group) => void;
  // onEditDescription?: (group: Group) => void;
  // onChangeImage?: (group: Group) => void;
}

// Lokale Hilfsfunktion für noch nicht implementierte Aktionen
const handlePlaceholderAction = (
  actionName: string,
  groupNameOrId: string | number
) => {
  toast.info(`${actionName} für Gruppe "${groupNameOrId}"`, {
    description: 'Diese Funktion ist noch nicht implementiert.',
    duration: 3000,
  });
};

export function GroupActionsMenu({ group, onDelete }: GroupActionsMenuProps) {
  // Hinweis: TooltipProvider wird hier hinzugefügt für Standalone-Nutzung.
  // Wenn der Parent (GroupSidebar) bereits einen Provider hat, ist dieser technisch nicht nötig,
  // schadet aber in der Regel auch nicht (Kontext wird überschrieben).
  return (
    <TooltipProvider delayDuration={100}>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            {/* Wichtig: stopPropagation, damit der Klick auf den Trigger nicht das Parent-Li auswählt */}
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant='ghost'
                size='icon'
                className='p-1 h-7 w-7 text-muted-foreground hover:text-foreground data-[state=open]:bg-white/20 dark:data-[state=open]:bg-white/10 flex-shrink-0 rounded-md'
                aria-label={`Optionen für Gruppe "${group.name || group.id}"`}
              >
                <MoreHorizontal className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent
            side='right'
            sideOffset={5}
            className='bg-popover text-popover-foreground border-border'
          >
            <p>Optionen</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent
          side='bottom'
          align='end'
          className='w-56 bg-popover text-popover-foreground border-border shadow-md'
          // Wichtig: stopPropagation, damit Klicks im Menü keine Parent-Handler auslösen
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenuLabel className='truncate px-2 py-1.5 text-sm font-semibold'>
            Aktionen für: {group.name || group.id}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className='bg-border/50' />
          <DropdownMenuItem
            className='focus:bg-accent focus:text-accent-foreground text-sm cursor-pointer' // cursor-pointer hinzugefügt
            // Ruft die lokale Platzhalterfunktion auf
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
            onSelect={() => onDelete(group)} // Ruft die übergebene onDelete-Prop auf
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
