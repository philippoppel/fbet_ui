'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
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
import { Trophy, Info } from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { GroupActionsMenu } from '@/app/components/dashboard/GroupActionMenu';

type LeaderboardWinner = {
  name: string | null;
  leaderSince?: string | Date | null;
};

type GroupHeaderCardProps = {
  group: Group;
  leaderboardWinner?: LeaderboardWinner | null;
  addEventForm: UseFormReturn<AddEventFormData>;
  onAddEventSubmit: (data: AddEventFormData) => void;
  isAddEventDialogOpen: boolean;
  onSetAddEventDialogOpen: (isOpen: boolean) => void;
  currentUserId: number | undefined | null;
  onDeleteGroup: (group: Group) => void;
  onImageChanged: () => void;
};

export function GroupHeaderCard({
  group,
  leaderboardWinner,
  addEventForm,
  onAddEventSubmit,
  isAddEventDialogOpen,
  onSetAddEventDialogOpen,
  currentUserId,
  onDeleteGroup,
  onImageChanged,
}: GroupHeaderCardProps) {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const isCreator =
    currentUserId != null &&
    group?.createdById != null &&
    currentUserId === group.createdById;

  const daysAsLeaderDisplay = useMemo(() => {
    if (leaderboardWinner?.leaderSince) {
      try {
        const leaderDate = new Date(leaderboardWinner.leaderSince);
        const today = new Date();

        const leaderDateOnly = new Date(
          leaderDate.getFullYear(),
          leaderDate.getMonth(),
          leaderDate.getDate()
        );
        const todayDateOnly = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        );

        const diffInMilliseconds =
          todayDateOnly.getTime() - leaderDateOnly.getTime();

        if (diffInMilliseconds < 0) return null;

        const diffDays = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'heute Nr. 1';
        if (diffDays === 1) return 'seit gestern Nr. 1';
        return `seit ${diffDays} Tagen Nr. 1`;
      } catch (error) {
        console.error('Error calculating days as leader:', error);
        return null;
      }
    }
    return null;
  }, [leaderboardWinner?.leaderSince]);

  return (
    <>
      <Card
        className={cn(
          'shadow-xl overflow-hidden group',
          'bg-background',
          'border border-muted/20 dark:border-white/10 rounded-xl',
          'transition-all duration-300 ease-in-out'
        )}
      >
        {group.imageUrl && (
          <div className='relative w-full h-48 sm:h-56 md:h-60 bg-muted/20 dark:bg-black/20'>
            <Image
              src={group.imageUrl}
              alt={group.name}
              fill
              sizes='(max-width: 768px) 100vw, 768px'
              className='object-cover rounded-b-none rounded-t-xl'
              priority
            />
          </div>
        )}

        <CardHeader
          className={cn(
            'flex flex-col sm:flex-row sm:items-center sm:justify-between',
            'gap-y-2 sm:gap-y-0 sm:gap-x-4',
            'p-4 sm:p-5 md:p-6'
          )}
        >
          {/* Linke Seite: Titel, Leader, Description */}
          <div className='flex flex-col gap-y-1 sm:gap-y-2 min-w-0'>
            <CardTitle
              className={cn(
                'font-extrabold text-foreground',
                'text-xl sm:text-2xl md:text-3xl',
                'truncate'
              )}
              title={group.name || 'Unbenannte Gruppe'}
            >
              {group.name || 'Unbenannte Gruppe'}
            </CardTitle>

            {(leaderboardWinner?.name || group.description) && (
              <div className='flex flex-wrap items-center text-sm text-muted-foreground gap-x-2 gap-y-1'>
                {leaderboardWinner?.name && (
                  <div className='flex items-center gap-x-1'>
                    <Trophy className='h-4 w-4 text-amber-500' />
                    <span className='font-medium text-foreground'>
                      Spitzenreiter: {leaderboardWinner.name}
                    </span>
                    {daysAsLeaderDisplay && (
                      <span className='text-xs text-muted-foreground/80'>
                        ({daysAsLeaderDisplay})
                      </span>
                    )}
                  </div>
                )}
                {group.description && (
                  <div className='flex items-center gap-x-1 max-w-full'>
                    <Info className='h-4 w-4' />
                    <span className='break-words whitespace-normal'>
                      {group.description}
                    </span>
                  </div>
                )}
              </div>
            )}

            {!group.description &&
              !group.inviteToken &&
              !leaderboardWinner?.name && (
                <p className='flex items-center text-xs text-amber-600 dark:text-amber-500'>
                  <Info className='mr-1.5 h-4 w-4' />
                  Kein Einladungslink & keine Beschreibung
                </p>
              )}
          </div>

          {/* Rechte Seite: Button & Menü */}
          <div className='flex items-center gap-x-2 flex-shrink-0 w-full sm:w-auto'>
            <Button
              variant='outline'
              onClick={() => {
                const el = document.getElementById('highscore-card');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className='flex-grow sm:flex-grow-0'
            >
              <Trophy className='h-4 w-4 mr-2' />
              Zur Rangliste
            </Button>

            <GroupActionsMenu
              group={group}
              onDelete={onDeleteGroup}
              onImageChanged={onImageChanged}
              isCreator={isCreator}
              onAddEventClick={() => onSetAddEventDialogOpen(true)}
              onInviteClick={() => setIsInviteDialogOpen(true)}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Dialog für das Einladen von Freunden */}
      {group.inviteToken && (
        <InviteDialog
          open={isInviteDialogOpen}
          setOpen={setIsInviteDialogOpen}
          groupName={group.name}
          inviteToken={group.inviteToken}
        />
      )}

      {/* Dialog zum Hinzufügen von Events */}
      <AddEventDialog
        open={isAddEventDialogOpen}
        setOpen={onSetAddEventDialogOpen}
        groupName={group.name}
        form={addEventForm}
        onSubmit={onAddEventSubmit}
      />
    </>
  );
}
