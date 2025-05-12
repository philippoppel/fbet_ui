'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/app/components/ui/button';
import {
  Users,
  PlusCircle,
  Loader2,
  ChevronsLeft,
  ChevronsRight,
  TriangleAlert,
  Star,
} from 'lucide-react';
import type { Group } from '@/app/lib/types';
import { cn } from '@/app/lib/utils';
import { CardTitle } from '@/app/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';

interface GroupSidebarProps {
  groups: Group[];
  selectedGroupId: number | null;
  onSelectGroup: (groupId: number) => void;
  isLoading: boolean;
  error: string | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  currentUserId: number | undefined | null;
  onDeleteGroup: (groupId: number) => Promise<void>;
}

export function GroupSidebar({
  groups,
  selectedGroupId,
  onSelectGroup,
  isLoading,
  error,
  isCollapsed = false,
  onToggleCollapse,
  currentUserId,
}: GroupSidebarProps) {
  const [favoriteGroupId, setFavoriteGroupId] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const favId = localStorage.getItem('favoriteGroupId');
      if (favId) setFavoriteGroupId(parseInt(favId, 10));
    }
  }, []);

  const sortedGroups = [...groups].sort((a, b) => {
    if (a.id === favoriteGroupId) return -1;
    if (b.id === favoriteGroupId) return 1;
    return 0;
  });

  // Direkt nach Mount: Gruppe auswählen, falls noch keine ausgewählt ist
  useEffect(() => {
    if (sortedGroups.length > 0 && selectedGroupId == null) {
      const lastSelected = localStorage.getItem('selectedGroupId');
      const fallbackId =
        lastSelected &&
        sortedGroups.find((g) => g.id === parseInt(lastSelected))
          ? parseInt(lastSelected)
          : sortedGroups[0].id;
      onSelectGroup(fallbackId);
    }
  }, [sortedGroups, selectedGroupId, onSelectGroup]);

  return (
    <TooltipProvider delayDuration={100}>
      <div
        className={cn(
          'flex flex-col transition-all duration-300 ease-in-out',
          'bg-muted/30 border border-border rounded-xl shadow-sm',
          isCollapsed ? 'w-full lg:w-[72px]' : 'w-full md:w-64 lg:w-72 xl:w-80'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex flex-row items-center gap-2 px-3 sm:px-4 py-3 border-b border-border',
            isCollapsed
              ? 'lg:px-2.5 lg:py-3 lg:justify-center'
              : 'justify-between'
          )}
        >
          <div
            className={cn(
              'flex items-center gap-2 min-w-0',
              isCollapsed && 'lg:hidden'
            )}
          >
            <Users className='w-5 h-5 text-primary flex-shrink-0' />
            <CardTitle className='text-base sm:text-lg font-semibold tracking-tight truncate text-foreground'>
              Gruppen
            </CardTitle>
          </div>
          <div className='flex items-center flex-shrink-0'>
            {/* Erstellen Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size={isCollapsed ? 'icon' : 'sm'}
                  className={cn(
                    'text-muted-foreground hover:text-foreground',
                    isCollapsed
                      ? 'lg:w-9 lg:h-9 p-0'
                      : 'flex items-center gap-1.5 px-2 py-1 h-auto'
                  )}
                  asChild
                  aria-label='Neue Gruppe erstellen'
                >
                  <Link href='/groups/create'>
                    <PlusCircle
                      className={cn(
                        'w-4 h-4 flex-shrink-0',
                        isCollapsed && 'lg:w-5 lg:h-5'
                      )}
                    />
                    <span
                      className={cn(
                        isCollapsed && 'lg:hidden',
                        'text-xs sm:text-sm'
                      )}
                    >
                      Erstellen
                    </span>
                  </Link>
                </Button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side='right' sideOffset={5}>
                  <p>Neue Gruppe erstellen</p>
                </TooltipContent>
              )}
            </Tooltip>
            {/* Collapse Button */}
            {onToggleCollapse && !isCollapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={onToggleCollapse}
                    className='hidden lg:flex w-9 h-9 text-muted-foreground hover:text-foreground ml-1'
                    aria-label='Sidebar einklappen'
                  >
                    <ChevronsLeft className='h-5 w-5' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side='bottom' sideOffset={5}>
                  <p>Einklappen</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Inhalt */}
        <div
          className={cn(
            'overflow-y-auto',
            isCollapsed ? 'lg:hidden px-0' : 'py-2 px-2 sm:px-3 space-y-1'
          )}
        >
          {isLoading && (
            <div className='flex flex-col items-center justify-center text-sm text-muted-foreground p-4'>
              <Loader2 className='h-8 w-8 animate-spin mb-3 opacity-50' />
              <span className='text-xs'>Gruppen laden...</span>
            </div>
          )}
          {error && !isLoading && (
            <div className='flex flex-col items-center justify-center text-destructive px-4 text-center py-10'>
              <TriangleAlert className='h-10 w-10 mb-3 opacity-70' />
              <p className='text-sm font-semibold'>Fehler:</p>
              <p className='text-xs text-destructive/80 mt-1'>{error}</p>
            </div>
          )}
          {!isLoading && !error && groups.length === 0 && !isCollapsed && (
            <div className='flex flex-col items-center justify-center text-center px-3 py-6 text-muted-foreground text-sm'>
              <Users className='mx-auto h-12 w-12 opacity-40 mb-4' />
              <p className='mb-1 text-sm'>Du bist noch in keiner Gruppe.</p>
              <p className='text-xs'>
                Erstelle eine neue Gruppe oder lass dich einladen.
              </p>
            </div>
          )}
          {!isLoading && !error && sortedGroups.length > 0 && !isCollapsed && (
            <ul className='space-y-0.5'>
              {sortedGroups.map((group) => {
                if (!group || typeof group.id === 'undefined') return null;
                const isSelected = selectedGroupId === group.id;

                return (
                  <li key={group.id} className='relative'>
                    <Button
                      data-testid={`group-btn-${group.id}`}
                      variant={isSelected ? 'default' : 'ghost'}
                      size='sm'
                      className={cn(
                        'w-full justify-start text-left h-auto py-1.5 px-2.5 transition-all duration-150',
                        'rounded-md text-sm pr-10',
                        isSelected
                          ? 'bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm'
                          : 'text-foreground/80 hover:text-foreground hover:bg-muted focus-visible:bg-muted'
                      )}
                      onClick={() => onSelectGroup(group.id)}
                      title={group.name || `Gruppe ${group.id}`}
                    >
                      <span className='truncate'>
                        {group.name || `Gruppe ${group.id}`}
                      </span>
                    </Button>
                    <button
                      onClick={() => {
                        localStorage.setItem(
                          'favoriteGroupId',
                          group.id.toString()
                        );
                        setFavoriteGroupId(group.id);
                      }}
                      className='absolute right-2 top-2'
                      title={
                        favoriteGroupId === group.id
                          ? 'Favorit – wird zuerst angezeigt'
                          : 'Als Favorit festlegen'
                      }
                    >
                      <Star
                        className={cn(
                          'w-4 h-4 transition-colors',
                          favoriteGroupId === group.id
                            ? 'fill-yellow-400 text-yellow-500'
                            : 'fill-transparent text-yellow-400 hover:fill-yellow-300 hover:text-yellow-500'
                        )}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Ausklappen Button bei Collapsed */}
        {onToggleCollapse && isCollapsed && (
          <div className='hidden lg:flex justify-center items-center py-2.5 border-t border-border'>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={onToggleCollapse}
                  className='w-9 h-9 text-muted-foreground hover:text-foreground'
                  aria-label='Sidebar ausklappen'
                >
                  <ChevronsRight className='h-5 w-5' />
                </Button>
              </TooltipTrigger>
              <TooltipContent side='right' sideOffset={5}>
                <p>Ausklappen</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
