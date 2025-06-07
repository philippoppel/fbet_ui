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
import { Share2, PlusCircle, Info, Trophy } from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { GroupActionsMenu } from '@/app/components/dashboard/GroupActionMenu';

// Der Typ für den Spitzenreiter, jetzt mit optionalem 'leaderSince'
type LeaderboardWinner = {
  name: string | null;
  leaderSince?: string | Date | null; // Datum (ISO-String oder Date-Objekt), seit wann Nr. 1
  // points?: number;
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
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const isCreator =
    currentUserId != null &&
    group?.createdById != null &&
    currentUserId === group.createdById;

  const daysAsLeaderDisplay = useMemo(() => {
    if (leaderboardWinner?.leaderSince) {
      try {
        const leaderDate = new Date(leaderboardWinner.leaderSince);
        const today = new Date();

        // Ignoriere die Zeitkomponente für die reine Tagesdifferenz
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

        if (diffInMilliseconds < 0) return null; // leaderSince liegt in der Zukunft, Datenfehler

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
          'bg-gradient-to-br from-background/70 via-background/60 to-background/70',
          'dark:from-slate-900/70 dark:via-slate-800/60 dark:to-slate-900/70',
          'backdrop-blur-xl supports-[backdrop-filter]:bg-opacity-60',
          'border border-white/20 dark:border-white/10 rounded-xl transition-all duration-300 ease-in-out hover:shadow-2xl'
        )}
      >
        {group.imageUrl && (
          <div className='relative w-full h-64 sm:h-72 md:h-60 bg-muted/20 dark:bg-black/20'>
            {' '}
            {/* Höhe leicht angepasst & Hintergrund für object-contain */}
            <Image
              src={group.imageUrl}
              alt={group.name}
              fill
              sizes='(max-width: 768px) 100vw, 768px'
              className='object-contain rounded-b-none rounded-t-xl' // Geändert zu object-contain
              priority
            />
          </div>
        )}

        <CardHeader
          className={cn(
            'flex flex-row items-start justify-between gap-x-3 sm:gap-x-4',
            'p-4 sm:p-5 md:p-6'
          )}
        >
          <div className='flex-1 space-y-1 min-w-0'>
            <CardTitle
              className={cn(
                'font-extrabold text-foreground group-hover:text-primary transition-colors duration-300',
                'text-lg xs:text-xl sm:text-2xl md:text-3xl', // Etwas größer
                'whitespace-nowrap overflow-hidden text-ellipsis'
              )}
              title={group.name || 'Unbenannte Gruppe'}
            >
              {group.name || 'Unbenannte Gruppe'}
            </CardTitle>

            {/* Info zum Erstplatzierten in der Rangliste - stärker hervorgehoben */}
            {leaderboardWinner?.name && (
              <div
                className={cn(
                  'text-sm sm:text-base flex items-center transition-colors duration-300 font-medium', // Standardgröße
                  'text-primary group-hover:text-primary/90', // Farbe geändert zu Primary
                  // Vertikaler Abstand angepasst
                  group.description || daysAsLeaderDisplay
                    ? 'mt-1.5 mb-2'
                    : 'my-1.5'
                )}
              >
                <Trophy className='h-5 w-5 mr-2 text-amber-500 flex-shrink-0' />{' '}
                {/* Icon leicht vergrößert */}
                <div className='flex flex-col sm:flex-row sm:items-center sm:gap-x-1.5'>
                  <span className='font-semibold text-foreground'>
                    {' '}
                    {/* Name in Vordergrundfarbe und fett */}
                    Spitzenreiter: {leaderboardWinner.name}
                  </span>
                  {daysAsLeaderDisplay && (
                    <span className='text-xs font-normal text-muted-foreground/80'>
                      ({daysAsLeaderDisplay})
                    </span>
                  )}
                </div>
              </div>
            )}

            {group.description && (
              <div className='relative'>
                <CardDescription
                  className={cn(
                    'text-xs sm:text-sm text-muted-foreground/90 group-hover:text-muted-foreground transition-colors duration-300',
                    'max-w-full',
                    !isDescriptionExpanded && 'line-clamp-2'
                  )}
                  title={group.description}
                >
                  {group.description}
                </CardDescription>
                {group.description.length > 80 && (
                  <button
                    type='button'
                    onClick={() =>
                      setIsDescriptionExpanded(!isDescriptionExpanded)
                    }
                    className='mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline'
                  >
                    {isDescriptionExpanded
                      ? 'Weniger anzeigen'
                      : 'Mehr anzeigen'}
                  </button>
                )}
              </div>
            )}

            {/* ... (Restliche Info-Messages bleiben gleich) ... */}
            {!group.description &&
              !group.inviteToken &&
              !leaderboardWinner?.name && (
                <p className='flex items-center text-xs text-amber-600 dark:text-amber-500 mt-2 pt-0.5 whitespace-nowrap overflow-hidden text-ellipsis'>
                  <Info className='mr-1.5 h-3.5 w-3.5 flex-shrink-0' />
                  Kein Einladungslink & keine Beschreibung
                </p>
              )}
            {(group.description || leaderboardWinner?.name) &&
              !group.inviteToken && (
                <p className='flex items-center text-xs text-amber-600 dark:text-amber-500 mt-2 pt-0.5 whitespace-nowrap overflow-hidden text-ellipsis'>
                  <Info className='mr-1.5 h-3.5 w-3.5 flex-shrink-0' />
                  Kein Einladungslink vorhanden
                </p>
              )}
          </div>

          {/* ... (Action Buttons bleiben gleich) ... */}
          <div className='flex items-center gap-x-1 xs:gap-x-2 flex-shrink-0'>
            {/* Mobile-Only: Button "Zur Rangliste" */}
            <div className='flex sm:hidden mt-2'>
              <Button
                size='sm'
                variant='outline'
                onClick={() => {
                  const el = document.getElementById('highscore-card');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className={cn(
                  'w-full justify-center',
                  'bg-transparent hover:bg-primary/10 border-primary/30 text-primary hover:text-primary dark:border-primary/40 dark:hover:bg-primary/10 transition-all duration-200'
                )}
              >
                <Trophy className='h-4 w-4 mr-2' />
                Zur Rangliste
              </Button>
            </div>

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

      {group.inviteToken && (
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
