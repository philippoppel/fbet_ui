// src/components/dashboard/GroupSidebar.tsx
'use client';

import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import {
  Users,
  PlusCircle,
  Loader2,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import type { Group } from '@/app/lib/types';
import { cn } from '@/app/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';

type GroupSidebarProps = {
  groups: Group[];
  selectedGroupId: number | null;
  onSelectGroup: (groupId: number) => void;
  isLoading: boolean;
  error: string | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
};

export function GroupSidebar({
  groups,
  selectedGroupId,
  onSelectGroup,
  isLoading,
  error,
  isCollapsed = false,
  onToggleCollapse,
}: GroupSidebarProps) {
  return (
    <TooltipProvider delayDuration={100}>
      {/* Main Card container - flex-col is crucial for footer positioning */}
      <Card
        className={cn(
          'shadow-sm bg-card border border-border flex flex-col h-full transition-all duration-300 ease-in-out',
          // Set width based on collapsed state for large screens
          isCollapsed ? 'w-full lg:w-[60px]' : 'w-full'
        )}
      >
        {/* --- Card Header --- */}
        <CardHeader
          className={cn(
            'flex flex-row items-center gap-2 px-4 py-3 border-b',
            // Adjust padding and alignment for collapsed state on lg screens
            isCollapsed
              ? 'lg:px-2 lg:py-3 lg:justify-center'
              : 'justify-between'
          )}
        >
          {/* Titel Container - Hide on lg screens when collapsed */}
          <div
            className={cn(
              'flex items-center gap-2 min-w-0',
              isCollapsed && 'lg:hidden' // Hide Title section on lg screens when collapsed
            )}
          >
            <Users className='w-5 h-5 text-muted-foreground flex-shrink-0' />
            <CardTitle className='text-lg font-semibold tracking-tight truncate'></CardTitle>
          </div>

          {/* Actions Container - Only Create Button & Collapse Button when NOT collapsed */}
          <div className='flex items-center flex-shrink-0 space-x-1'>
            {/* Erstellen Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size={isCollapsed ? 'icon' : 'sm'}
                  className={cn(
                    // Ensure consistent icon button size on lg when collapsed
                    isCollapsed && 'lg:w-8 lg:h-8',
                    // Add gap only when text is visible (not collapsed)
                    !isCollapsed && 'gap-1.5'
                  )}
                  asChild
                  aria-label='Neue Gruppe erstellen'
                >
                  {/* Center icon within link when collapsed */}
                  <Link
                    href='/groups/create'
                    className={cn(
                      isCollapsed && 'lg:flex lg:items-center lg:justify-center'
                    )}
                  >
                    <PlusCircle
                      className={cn('w-4 h-4', isCollapsed && 'lg:w-5 lg:h-5')}
                    />
                    {/* Text hidden on lg screens when collapsed */}
                    <span className={cn(isCollapsed && 'lg:hidden')}>
                      Erstellen
                    </span>
                  </Link>
                </Button>
              </TooltipTrigger>
              {/* Show tooltip only when collapsed (icon only) */}
              {isCollapsed && (
                <TooltipContent side='right'>
                  <p>Neue Gruppe erstellen</p>
                </TooltipContent>
              )}
            </Tooltip>

            {/* Collapse Toggle Button (<<) - Show only when NOT collapsed */}
            {onToggleCollapse && !isCollapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={onToggleCollapse}
                    // Show only on lg screens when sidebar is expanded
                    className='hidden lg:flex w-8 h-8'
                    aria-label='Sidebar einklappen'
                  >
                    <ChevronsLeft className='h-5 w-5' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side='right'>
                  <p>Sidebar einklappen</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </CardHeader>

        {/* --- Card Content (Scrollable Area) --- */}
        <CardContent
          className={cn(
            'flex-1 overflow-y-auto pt-2 pb-4 px-2', // flex-1 makes it take available space
            isCollapsed && 'lg:hidden' // Hide content on lg screens when collapsed
          )}
        >
          {/* ... (existing content: loading, error, empty state, groups list) ... */}
          {isLoading && (
            <div className='flex items-center justify-center text-sm text-muted-foreground p-4'>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              <span>Gruppen laden...</span>
            </div>
          )}
          {error && (
            <p className='text-sm text-destructive px-2 py-4 text-center'>
              {error}
            </p>
          )}
          {!isLoading && !error && groups.length === 0 && (
            <div className='text-center px-2 py-6 text-muted-foreground text-sm'>
              <Users className='mx-auto h-10 w-10 opacity-50 mb-3' />
              <p className='mb-3'>Du bist noch in keiner Gruppe.</p>
              <Button size='sm' variant='outline' asChild>
                <Link href='/groups/create'>
                  <PlusCircle className='mr-2 h-4 w-4' /> Erste Gruppe erstellen
                </Link>
              </Button>
            </div>
          )}
          {!isLoading && !error && groups.length > 0 && (
            <ul className='space-y-1'>
              {groups.map((group) => {
                if (!group || typeof group.id === 'undefined') return null;
                const isSelected = selectedGroupId === group.id;
                return (
                  <li key={group.id}>
                    <Button
                      data-testid={`group-btn-${group.id}`}
                      variant={isSelected ? 'secondary' : 'ghost'}
                      size='sm'
                      className={cn(
                        'w-full justify-start text-left h-auto py-1.5 px-2 transition-colors',
                        !isSelected &&
                          'hover:bg-accent hover:text-accent-foreground',
                        isSelected &&
                          'font-semibold border-l-2 border-primary pl-[calc(0.5rem-2px)]'
                      )}
                      onClick={() => onSelectGroup(group.id)}
                      title={group.name || `Gruppe ${group.id}`}
                    >
                      <span className='truncate'>
                        {group.name || `Gruppe ${group.id}`}
                      </span>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>

        {/* --- Footer Area for Expand Toggle (>>) --- */}
        {/* This div is pushed to the bottom because CardContent has flex-1 */}
        {/* It's only visible on large screens when the sidebar is collapsed */}
        {onToggleCollapse && isCollapsed && (
          <div
            className={cn(
              'hidden lg:flex justify-center items-center py-3 border-t' // Show only on lg when collapsed
            )}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={onToggleCollapse}
                  className='w-8 h-8' // Consistent icon button size
                  aria-label='Sidebar ausklappen'
                >
                  <ChevronsRight className='h-5 w-5' /> {/* Expand Icon */}
                </Button>
              </TooltipTrigger>
              <TooltipContent side='right'>
                <p>Sidebar ausklappen</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </Card>
    </TooltipProvider>
  );
}
