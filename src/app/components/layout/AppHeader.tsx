// src/components/AppHeader.tsx
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  Users,
  RefreshCw,
  Flame,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { UserOut, Group } from '@/app/lib/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/app/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { GroupSidebar } from '@/app/components/dashboard/GroupSidebar';
import { useAppRefresh } from '@/app/hooks/useAppRefresh';
import { getGroupsWithOpenEvents, GroupWithOpenEvents } from '@/app/lib/api';

interface AppHeaderProps {
  user: UserOut | null;
  onLogout?: () => void;
  myGroups?: Group[];
  selectedGroupId?: number | null;
  onSelectGroup?: (groupId: number) => void;
}

const REFRESH_OPEN_EVENTS_MS = 60_000; // 1Min –anpassen nach Bedarf

export function AppHeader({
  user,
  onLogout,
  myGroups = [],
  selectedGroupId = null,
  onSelectGroup,
}: AppHeaderProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const hasGroups = myGroups.length > 0;
  const displayName = user?.name?.split(' ')[0] || user?.email || '';
  const { refresh, updateAvailable, online } = useAppRefresh();

  const [groupsWithOpenEvents, setGroupsWithOpenEvents] = useState<
    GroupWithOpenEvents[]
  >([]);
  const [isLoadingOpenEvents, setIsLoadingOpenEvents] = useState(false);

  /**
   * Statt nur eines Boolean speichern wir den zuletzt als gelesen
   * bestätigten Event‑COUNT.  Sobald die tatsächliche Anzahl diesen Wert
   * übersteigt, zeigen wir wieder eine Notification.
   */
  const [lastDismissedCount, setLastDismissedCount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('openEventNotificationLastCount');
      return stored ? parseInt(stored, 10) : 0;
    }
    return 0;
  });

  /**
   * Holt die offenen Events (ein Aufruf, damit wir ihn mehrfach verwenden
   * können).  useCallback verhindert bei jeder Render‑Schleife eine neue
   * Funktions‑Instanz – wichtig für setInterval‑Cleanup.
   */
  const fetchOpenEvents = useCallback(async () => {
    if (!user) return; // Ohne User kein Token → kein Aufruf
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!token) return;
    try {
      // Beim Polling wollen wir keinen Spinner jedes Mal … nur beim allerersten
      setIsLoadingOpenEvents(
        (prev) => prev || groupsWithOpenEvents.length === 0
      );
      const data = await getGroupsWithOpenEvents(token);
      setGroupsWithOpenEvents(data);
    } catch (e) {
      console.error('Fehler beim Laden offener Events', e);
    } finally {
      setIsLoadingOpenEvents(false);
    }
  }, [user, groupsWithOpenEvents.length]);

  // Initial laden, wenn sich der User ändert (Login/Logout)
  useEffect(() => {
    fetchOpenEvents();
  }, [fetchOpenEvents]);

  // Wiederkehrendes Polling, bis der User ausloggt / Komponente unmountet
  useEffect(() => {
    if (!user) return;
    const id = setInterval(fetchOpenEvents, REFRESH_OPEN_EVENTS_MS);
    return () => clearInterval(id);
  }, [user, fetchOpenEvents]);

  const openEventCount = useMemo(
    () => groupsWithOpenEvents.reduce((sum, g) => sum + g.openEvents.length, 0),
    [groupsWithOpenEvents]
  );

  const isNotificationActive = openEventCount > lastDismissedCount;

  const handleSelectAndClose = (groupId: number) => {
    onSelectGroup?.(groupId);
    setIsSheetOpen(false);
  };

  const handleMarkAsRead = () => {
    setLastDismissedCount(openEventCount);
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'openEventNotificationLastCount',
        String(openEventCount)
      );
    }
  };

  return (
    <header className='sticky top-0 z-50 w-full border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6 lg:px-8'>
      <div className='flex h-14 items-center'>
        {user && hasGroups && onSelectGroup && (
          <div className='mr-2 lg:hidden'>
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  aria-label='Gruppen anzeigen'
                >
                  <Menu className='h-5 w-5' />
                </Button>
              </SheetTrigger>
              <SheetContent
                side='left'
                className='w-[280px] sm:w-[320px] p-0 flex flex-col'
              >
                <SheetHeader className='p-4 border-b'>
                  <SheetTitle className='flex items-center gap-2 text-base font-semibold'>
                    <Users className='w-5 h-5 text-muted-foreground' />
                  </SheetTitle>
                </SheetHeader>
                <div className='flex-1 overflow-y-auto p-4'>
                  <GroupSidebar
                    groups={myGroups}
                    selectedGroupId={selectedGroupId}
                    onSelectGroup={handleSelectAndClose}
                    isLoading={false}
                    error={null}
                    isCollapsed={false}
                    currentUserId={user?.id}
                    onDeleteGroup={async () => {
                      console.warn('onDeleteGroup nicht implementiert');
                    }}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}

        <Link
          href={user ? '/dashboard' : '/'}
          className='flex items-center space-x-2 hover:opacity-80 transition-opacity'
        >
          <img src='/icon0.svg' alt='Fbet Logo' className='h-8 w-auto' />
          <span className='text-lg font-bold tracking-tight'>fbet</span>
        </Link>

        <div className='ml-auto flex items-center space-x-2 sm:space-x-3'>
          {openEventCount > 0 && isNotificationActive && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  aria-label='Offene Wetten'
                  className='relative'
                >
                  <Flame className='h-5 w-5 text-orange-500' />
                  <span className='absolute -top-1 -right-1 text-xs bg-red-500 text-white rounded-full px-1.5'>
                    {openEventCount}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuItem disabled className='text-sm font-semibold'>
                  Offene Wetten
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={handleMarkAsRead}
                  className='text-xs text-muted-foreground flex items-center gap-2'
                >
                  <EyeOff className='w-3 h-3' /> Als gelesen markieren
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {groupsWithOpenEvents.map((g) => (
                  <DropdownMenuItem
                    key={g.groupId}
                    onSelect={() => onSelectGroup?.(g.groupId)}
                  >
                    {g.groupName} ({g.openEvents.length})
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            variant={updateAvailable ? 'default' : 'ghost'}
            size='icon'
            aria-label='App neu laden'
            onClick={refresh}
            className='relative'
          >
            <RefreshCw
              className={`h-4 w-4 transition-transform ${updateAvailable ? 'animate-spin' : ''}`}
            />
            {!online && (
              <span className='absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive' />
            )}
          </Button>

          {user ? (
            <>
              <span className='hidden text-sm text-muted-foreground sm:inline-block'>
                Hi, {displayName}!
              </span>
              {onLogout && (
                <Button
                  aria-label='Logout'
                  onClick={onLogout}
                  variant='outline'
                  size='sm'
                  className='gap-1.5'
                >
                  <LogOut className='h-4 w-4' />
                  <span className='hidden sm:inline'>Logout</span>
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant='ghost' size='sm' asChild>
                <Link href='/login'>
                  <LogIn className='h-4 w-4 sm:mr-1' />
                  <span className='hidden sm:inline'>Login</span>
                </Link>
              </Button>
              <Button size='sm' asChild>
                <Link href='/register'>
                  <UserPlus className='h-4 w-4 sm:mr-1' />
                  <span className='hidden sm:inline'>Registrieren</span>
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
