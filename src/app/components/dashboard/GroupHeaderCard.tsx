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
import type { Group, MixedEvent } from '@/app/lib/types';
import type { UseFormReturn } from 'react-hook-form';
import type { AddEventFormData } from '@/app/hooks/useGroupInteractions';
import { Share2, PlusCircle } from 'lucide-react';
import { cn } from '@/app/lib/utils';

type GroupHeaderCardProps = {
  group: Group;
  addEventForm: UseFormReturn<AddEventFormData>;
  onAddEventSubmit: (data: AddEventFormData) => void;
  isAddEventDialogOpen: boolean;
  onSetAddEventDialogOpen: (isOpen: boolean) => void;
};

export function GroupHeaderCard({
  group,
  addEventForm,
  onAddEventSubmit,
  isAddEventDialogOpen,
  onSetAddEventDialogOpen,
}: GroupHeaderCardProps) {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  console.log(
    'Group object in GroupHeaderCard:',
    JSON.stringify(group, null, 2)
  ); // <--- WICHTIG!

  return (
    <>
      <Card className='shadow-md'>
        <CardHeader className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 flex-wrap'>
          <div className='flex-1 min-w-[200px]'>
            <CardTitle className='text-2xl font-bold'>{group.name}</CardTitle>
            {group.description && (
              <CardDescription className='mt-1 max-w-prose'>
                {group.description}
              </CardDescription>
            )}
            {!group.inviteToken && (
              <p className='text-xs text-muted-foreground mt-2'>
                Einladungslink noch nicht generiert.
              </p>
            )}
          </div>

          <div className='flex flex-col sm:flex-row gap-2 flex-shrink-0 items-start sm:items-center'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setIsInviteDialogOpen(true)}
              disabled={!group.inviteToken}
              aria-label='Freunde einladen'
            >
              <Share2 className='mr-2 h-4 w-4' />
              Freunde einladen
            </Button>

            <AddEventDialog
              groupName={group.name}
              open={isAddEventDialogOpen}
              setOpen={onSetAddEventDialogOpen}
              form={addEventForm}
              onSubmit={onAddEventSubmit}
              triggerProps={{
                variant: 'ghost',
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
      </Card>

      <InviteDialog
        open={isInviteDialogOpen}
        setOpen={setIsInviteDialogOpen}
        groupName={group.name}
        inviteToken={group.inviteToken}
      />
    </>
  );
}
