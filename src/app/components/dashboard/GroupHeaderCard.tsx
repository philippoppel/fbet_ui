// src/app/components/dashboard/GroupHeaderCard.tsx
'use client';

import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { AddEventDialog } from '@/app/components/dashboard/AddEventDialog';
import { InviteDialog } from '@/app/components/dashboard/InviteDialog';
import type { Group } from '@/app/lib/types';
import type { UseFormReturn } from 'react-hook-form';
import type { AddEventFormData } from '@/app/hooks/useGroupInteractions';
import { Share2, PlusCircle, Info } from 'lucide-react'; // MoreVertical wird typischerweise IN GroupActionsMenu verwendet
import { cn } from '@/app/lib/utils';
import { GroupActionsMenu } from '@/app/components/dashboard/GroupActionMenu'; // Stelle sicher, dass diese Komponente einen Trigger rendert

type GroupHeaderCardProps = {
  group: Group;
  addEventForm: UseFormReturn<AddEventFormData>;
  onAddEventSubmit: (data: AddEventFormData) => void;
  isAddEventDialogOpen: boolean;
  onSetAddEventDialogOpen: (isOpen: boolean) => void;
  currentUserId: number | undefined | null;
  onDeleteGroup: (group: Group) => void; // Geändert von (groupId: number) zu (group: Group) um konsistent zu sein
};

export function GroupHeaderCard({
  group,
  addEventForm,
  onAddEventSubmit,
  isAddEventDialogOpen,
  onSetAddEventDialogOpen,
  currentUserId,
  onDeleteGroup,
}: GroupHeaderCardProps) {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  // Prüfen, ob der aktuelle Benutzer der Ersteller der Gruppe ist
  const isCreator =
    currentUserId != null && // Stellt sicher, dass currentUserId nicht null oder undefined ist
    group?.createdById != null && // Stellt sicher, dass group und group.createdById existieren
    currentUserId === group.createdById;

  // WICHTIG FÜR DEBUGGING: Überprüfe diesen Log in der Konsole deines Browsers!
  // Dieser Log hilft dir zu verstehen, warum `isCreator` true oder false ist.
  console.log(
    `[GroupHeaderCard] Group: "${group?.name}", Created By ID: ${group?.createdById} (Typ: ${typeof group?.createdById}), Current User ID: ${currentUserId} (Typ: ${typeof currentUserId}), Is Creator: ${isCreator}`
  );

  return (
    <>
      <Card
        className={cn(
          'shadow-xl overflow-hidden group',
          'bg-gradient-to-br from-background/70 via-background/60 to-background/70',
          'dark:from-slate-900/70 dark:via-slate-800/60 dark:to-slate-900/70',
          'backdrop-blur-xl supports-[backdrop-filter]:bg-opacity-60',
          'border border-white/20 dark:border-white/10 rounded-xl transition-all duration-300 ease-in-out hover:shadow-2xl'
        )}
      >
        <CardHeader className='flex flex-col md:flex-row md:items-start md:justify-between gap-4 p-5 md:p-6'>
          {/* Linke Seite: Titel, Beschreibung */}
          <div className='flex-1 space-y-1.5 min-w-0'>
            <CardTitle className='text-2xl lg:text-3xl font-extrabold text-foreground group-hover:text-primary transition-colors duration-300'>
              {group.name || 'Unbenannte Gruppe'}
            </CardTitle>
            {group.description && (
              <CardDescription className='mt-1 text-sm text-muted-foreground/90 group-hover:text-muted-foreground transition-colors duration-300 max-w-2xl'>
                {group.description}
              </CardDescription>
            )}
            {!group.inviteToken && (
              <p className='flex items-center text-xs text-amber-600 dark:text-amber-500 mt-2 pt-1'>
                <Info className='mr-1.5 h-3.5 w-3.5 flex-shrink-0' />
                Diese Gruppe hat aktuell keinen Einladungslink.
              </p>
            )}
          </div>

          {/* Rechte Seite: Aktionen */}
          <div className='flex flex-col sm:flex-row sm:items-center gap-2 flex-shrink-0 pt-2 md:pt-0'>
            <AddEventDialog
              groupName={group.name}
              open={isAddEventDialogOpen}
              setOpen={onSetAddEventDialogOpen}
              form={addEventForm}
              onSubmit={onAddEventSubmit}
              triggerProps={{
                variant: 'outline',
                size: 'sm',
                className:
                  'bg-transparent hover:bg-primary/10 border-primary/30 text-primary hover:text-primary dark:border-primary/40 dark:hover:bg-primary/10 transition-all duration-200 w-full sm:w-auto',
                children: (
                  <>
                    <PlusCircle className='mr-2 h-4 w-4' /> Event erstellen
                  </>
                ),
              }}
            />

            <Button
              variant='outline'
              size='sm'
              onClick={() => setIsInviteDialogOpen(true)}
              disabled={!group.inviteToken}
              aria-label='Freunde einladen'
              className='bg-transparent hover:bg-accent/50 border-foreground/20 text-foreground/80 hover:text-foreground disabled:opacity-50 dark:border-foreground/30 transition-all duration-200 w-full sm:w-auto'
            >
              <Share2 className='mr-2 h-4 w-4' />
              Einladen
            </Button>

            {isCreator && (
              <GroupActionsMenu
                group={group}
                onDelete={() => onDeleteGroup(group)} // Stellt sicher, dass das ganze Group-Objekt übergeben wird
                // Falls GroupActionsMenu weitere Props benötigt (z.B. für Umbenennen etc.), hier hinzufügen.
                // Zum Beispiel:
                // onRename={(g) => console.log("Rename action for", g.name)}
              />
            )}
            {/* Wenn du das Menü ZU TESTZWECKEN IMMER sehen willst, auch wenn isCreator false ist: */}
            {/*
            {!isCreator && (
              <div className="p-2 border border-dashed border-yellow-500">
                <p className="text-xs text-yellow-600">DEBUG: Menü wäre hier (isCreator ist false)</p>
                <GroupActionsMenu
                  group={group}
                  onDelete={() => onDeleteGroup(group)}
                />
              </div>
            )}
            */}
          </div>
        </CardHeader>
      </Card>

      {/* Invite Dialog (außerhalb der Card) */}
      {group.inviteToken && ( // Dialog nur rendern, wenn ein Token existiert, um Fehler zu vermeiden
        <InviteDialog
          open={isInviteDialogOpen}
          setOpen={setIsInviteDialogOpen}
          groupName={group.name}
          inviteToken={group.inviteToken}
        />
      )}
    </>
  );
}
