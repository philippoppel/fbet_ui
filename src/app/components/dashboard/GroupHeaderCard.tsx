'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { AddEventDialog } from '@/app/components/dashboard/AddEventDialog';
import { InviteDialog } from '@/app/components/dashboard/InviteDialog';
import type { Group } from '@/app/lib/types';
import type { UseFormReturn } from 'react-hook-form';
import type { AddEventFormData } from '@/app/hooks/useGroupInteractions';
import {
  Share2,
  PlusCircle,
  Info,
  MoreHorizontal,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { GroupActionsMenu } from '@/app/components/dashboard/GroupActionMenu';

type GroupHeaderCardProps = {
  group: Group;
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
        {/* ───────── Hero-Bild ───────── */}
        {group.imageUrl && (
          <div className='relative w-full h-52'>
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

        {/* ───────── Header-Bereich ───────── */}
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
                'text-base xs:text-lg sm:text-xl md:text-2xl',
                'whitespace-nowrap overflow-hidden text-ellipsis'
              )}
              title={group.name || 'Unbenannte Gruppe'}
            >
              {group.name || 'Unbenannte Gruppe'}
            </CardTitle>

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

            {!group.description && !group.inviteToken && (
              <p className='flex items-center text-xs text-amber-600 dark:text-amber-500 mt-1 pt-0.5 whitespace-nowrap overflow-hidden text-ellipsis'>
                <Info className='mr-1.5 h-3.5 w-3.5 flex-shrink-0' />
                Kein Einladungslink
              </p>
            )}
          </div>

          {/* ───────── Action-Buttons ───────── */}
          <div className='flex items-center gap-x-1 xs:gap-x-2 flex-shrink-0'>
            <div className='hidden sm:flex sm:items-center sm:gap-x-1.5 md:gap-x-2'>
              <AddEventDialog
                groupName={group.name}
                open={isAddEventDialogOpen}
                setOpen={onSetAddEventDialogOpen}
                form={addEventForm}
                onSubmit={onAddEventSubmit}
                triggerProps={{
                  variant: 'outline',
                  size: 'sm',
                  className: cn(
                    'bg-transparent hover:bg-primary/10 border-primary/30 text-primary hover:text-primary dark:border-primary/40 dark:hover:bg-primary/10 transition-all duration-200',
                    'flex items-center overflow-hidden px-2 md:px-3'
                  ),
                  children: (
                    <>
                      <PlusCircle className='h-4 w-4 flex-shrink-0 sm:mr-1 md:mr-1.5' />
                      <span className='whitespace-nowrap overflow-hidden text-ellipsis hidden xs:inline'>
                        Event
                      </span>
                    </>
                  ),
                }}
              />

              <Button
                size='sm'
                onClick={() => setIsInviteDialogOpen(true)}
                disabled={!group.inviteToken}
                aria-label='Freunde einladen'
                className={cn(
                  'text-white disabled:opacity-50 transition-all duration-200',
                  'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500',
                  'flex items-center overflow-hidden px-2 md:px-3'
                )}
              >
                <Share2 className='h-4 w-4 flex-shrink-0 sm:mr-1 md:mr-1.5' />
                <span className='whitespace-nowrap overflow-hidden text-ellipsis hidden xs:inline'>
                  Einladen
                </span>
              </Button>
            </div>

            {/* Mobile-Menü */}
            <div className='sm:hidden'>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    aria-label='Weitere Aktionen'
                    className='h-8 w-8 xs:h-9 xs:w-9'
                  >
                    <MoreHorizontal className='h-4 w-4 xs:h-5 xs:w-5' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' sideOffset={5}>
                  <DropdownMenuItem
                    onClick={() => onSetAddEventDialogOpen(true)}
                  >
                    <PlusCircle className='mr-2 h-4 w-4' />
                    <span>Event erstellen</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsInviteDialogOpen(true)}
                    disabled={!group.inviteToken}
                  >
                    <Share2 className='mr-2 h-4 w-4' />
                    <span>Einladen</span>
                  </DropdownMenuItem>
                  {isCreator && (
                    <DropdownMenuItem
                      onClick={() => onDeleteGroup(group)}
                      className='text-destructive focus:text-destructive focus:bg-destructive/10'
                    >
                      Gruppe löschen
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {isCreator && (
              <div className='hidden sm:block'>
                <GroupActionsMenu
                  group={group}
                  onDelete={() => onDeleteGroup(group)}
                  onImageChanged={onImageChanged}
                />
              </div>
            )}
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
