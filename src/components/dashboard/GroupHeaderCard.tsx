// src/components/dashboard/GroupHeaderCard.tsx
'use client';

import { useState } from 'react'; // useEffect nicht mehr hier benötigt für Share-Check
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// --- Dropdown entfernt ---
import { AddEventDialog } from '@/components/dashboard/AddEventDialog';
import { InviteDialog } from '@/components/dashboard/InviteDialog'; // <--- NEU: Import InviteDialog
import type { Group, MixedEvent } from '@/lib/types';
import type { UseFormReturn } from 'react-hook-form';
import type { AddEventFormData } from '@/hooks/useGroupInteractions';
import { Share2, PlusCircle } from 'lucide-react'; // Copy nicht mehr hier benötigt
// import { toast } from 'sonner'; // Toasts sind jetzt im InviteDialog
import { cn } from '@/lib/utils';

type GroupHeaderCardProps = {
  group: Group;
  combinedEvents: MixedEvent[];
  // Event Dialog Props
  addEventForm: UseFormReturn<AddEventFormData>;
  onAddEventSubmit: (data: AddEventFormData) => void;
  isAddEventDialogOpen: boolean;
  onSetAddEventDialogOpen: (isOpen: boolean) => void;
};

export function GroupHeaderCard({
  group,
  combinedEvents,
  addEventForm,
  onAddEventSubmit,
  isAddEventDialogOpen,
  onSetAddEventDialogOpen,
}: GroupHeaderCardProps) {
  // State für den neuen Invite-Dialog
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  // --- Logik für Kopieren/Teilen wurde in InviteDialog verschoben ---

  return (
    // Das Fragment umschließt jetzt BEIDE Elemente korrekt
    <>
      <Card className='shadow-md'>
        <CardHeader className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 flex-wrap'>
          {/* Gruppeninfo */}
          <div className='flex-1 min-w-[200px]'>
            <CardTitle className='text-2xl font-bold'>{group.name}</CardTitle>
            {group.description && (
              <CardDescription className='mt-1 max-w-prose'>
                {group.description}
              </CardDescription>
            )}
            {!group.invite_token && (
              <p className='text-xs text-muted-foreground mt-2'>
                Einladungslink noch nicht generiert.
              </p>
            )}
          </div>

          {/* Aktionsbuttons */}
          <div className='flex flex-col sm:flex-row gap-2 flex-shrink-0 items-start sm:items-center'>
            {/* Button zum Öffnen des Invite-Dialogs */}
            <Button
              variant='outline'
              size='sm'
              onClick={() => setIsInviteDialogOpen(true)}
              disabled={!group.invite_token}
              aria-label='Freunde einladen'
            >
              <Share2 className='mr-2 h-4 w-4' />
              Freunde einladen
            </Button>

            {/* Dialog zum Event hinzufügen */}
            <AddEventDialog
              groupName={group.name}
              open={isAddEventDialogOpen}
              setOpen={onSetAddEventDialogOpen}
              form={addEventForm}
              suggestions={combinedEvents}
              onSubmit={onAddEventSubmit}
              triggerProps={{
                variant: 'outline',
                size: 'sm',
                children: (
                  <>
                    <PlusCircle className='mr-2 h-4 w-4' /> Event hinzufügen
                  </>
                ),
              }}
            />
          </div>
        </CardHeader>
      </Card>{' '}
      {/* Ende des Card Elements */}
      {/* Der Invite-Dialog steht direkt NACH der Card, aber INNERHALB des Fragments */}
      <InviteDialog
        open={isInviteDialogOpen}
        setOpen={setIsInviteDialogOpen}
        groupName={group.name}
        inviteToken={group.invite_token}
      />
    </> // Ende des Fragments
  ); // Ende des return Statements
}
