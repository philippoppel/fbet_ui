'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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
import { UserOut, Group as GroupType } from '@/app/lib/types';
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
import {
  getGroupsWithOpenEvents,
  getMyTipsAcrossAllGroups,
  GroupWithOpenEvents,
} from '@/app/lib/api';

const STORAGE_KEY_SEEN_NOTIFICATIONS = 'fbet_openEventNotificationSeenIds_v2';

export function AppHeader({
  user,
  onLogout,
  myGroups = [],
  selectedGroupId = null,
  onSelectGroup,
}: {
  user: UserOut | null;
  onLogout?: () => void;
  myGroups?: GroupType[];
  selectedGroupId?: number | null;
  onSelectGroup?: (groupId: number) => void;
}) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { refresh, updateAvailable, online } = useAppRefresh();
  const displayName = user?.name?.split(' ')[0] || user?.email || '';

  const [groupsWithOpenEventsData, setGroupsWithOpenEventsData] = useState<
    GroupWithOpenEvents[]
  >([]);
  const [isLoadingOpenEvents, setIsLoadingOpenEvents] = useState(false);
  const [userTippedEventIdsAll, setUserTippedEventIdsAll] = useState<
    Set<number>
  >(new Set());
  const [seenNotificationEventIds, setSeenNotificationEventIds] = useState<
    Set<number>
  >(() => {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_SEEN_NOTIFICATIONS);
      if (raw) {
        try {
          const arr: number[] = JSON.parse(raw);
          if (Array.isArray(arr) && arr.every((id) => typeof id === 'number')) {
            return new Set(arr);
          }
        } catch (e) {
          console.error(
            'Error parsing seenNotificationEventIds from localStorage',
            e
          );
        }
      }
    }
    return new Set();
  });

  const fetchOpenEventsForHeader = useCallback(async () => {
    if (!user) return;
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('fbet_token') : null;
    if (!token) return;
    setIsLoadingOpenEvents(true);
    try {
      const data = await getGroupsWithOpenEvents(token);
      setGroupsWithOpenEventsData(data || []);
    } catch (error) {
      console.error(
        'Fehler beim Laden der offenen Events für den Header:',
        error
      );
      setGroupsWithOpenEventsData([]);
    } finally {
      setIsLoadingOpenEvents(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOpenEventsForHeader();
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('fbet_token') : null;
    if (!token) return;
    getMyTipsAcrossAllGroups(token)
      .then((allTips) => {
        const tipIds = new Set<number>(allTips.map((tip) => tip.eventId));
        setUserTippedEventIdsAll(tipIds);
      })
      .catch((err) => {
        console.error(
          '[AppHeader] Fehler beim Laden der Tipps über alle Gruppen:',
          err
        );
      });
  }, [user?.id]);

  const untippedOpenEventsByGroup = useMemo(() => {
    return groupsWithOpenEventsData
      .map((group) => {
        const untippedEvents = group.openEvents.filter(
          (event) => !userTippedEventIdsAll.has(Number(event.id))
        );
        return {
          ...group,
          openEvents: untippedEvents,
          untippedEventCountInGroup: untippedEvents.length,
        };
      })
      .filter((group) => group.untippedEventCountInGroup > 0);
  }, [groupsWithOpenEventsData, userTippedEventIdsAll]);

  const notificationCount = useMemo(() => {
    let count = 0;
    untippedOpenEventsByGroup.forEach((group) => {
      group.openEvents.forEach((event) => {
        if (!seenNotificationEventIds.has(Number(event.id))) {
          count++;
        }
      });
    });
    return count;
  }, [untippedOpenEventsByGroup, seenNotificationEventIds]);

  const handleSelectAndCloseSheet = (groupId: number) => {
    onSelectGroup?.(groupId);
    setIsSheetOpen(false);
  };

  const handleMarkNotificationsAsRead = () => {
    const newSeenIdsSet = new Set(seenNotificationEventIds);
    untippedOpenEventsByGroup.forEach((group) => {
      group.openEvents.forEach((event) => {
        newSeenIdsSet.add(Number(event.id));
      });
    });
    setSeenNotificationEventIds(newSeenIdsSet);
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        STORAGE_KEY_SEEN_NOTIFICATIONS,
        JSON.stringify(Array.from(newSeenIdsSet))
      );
    }
  };
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOpenEventsForHeader();
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('fbet_token')
          : null;
      if (!token) return;
      getMyTipsAcrossAllGroups(token)
        .then((allTips) => {
          const tipIds = new Set<number>(allTips.map((tip) => tip.eventId));
          setUserTippedEventIdsAll(tipIds);
        })
        .catch((err) => {
          console.error('[AppHeader] Fehler beim Tipp-Reload:', err);
        });
    }, 60_000); // alle 60 Sekunden

    return () => clearInterval(interval);
  }, [fetchOpenEventsForHeader, user?.id]);

  return (
    <header className='sticky top-0 z-50 w-full border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6 lg:px-8'>
      <div className='flex h-14 items-center justify-between'>
        <Link
          href={user ? '/dashboard' : '/'}
          className='flex items-center space-x-2 hover:opacity-80 transition-opacity'
        >
          <img src='/icon0.svg' alt='Fbet Logo' className='h-8 w-auto' />
          <span className='text-lg font-bold tracking-tight'>fbet</span>
        </Link>

        <div className='flex items-center space-x-2 sm:space-x-3'>
          {user && myGroups.length > 0 && onSelectGroup && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  aria-label='Offene Wetten'
                  className='relative'
                >
                  <Flame className='h-5 w-5 text-orange-500' />
                  {notificationCount > 0 && (
                    <span className='absolute -top-1 -right-1 text-xs bg-red-500 text-white rounded-full px-1.5'>
                      {notificationCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuItem disabled className='text-sm font-semibold'>
                  Offene Wetten
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={handleMarkNotificationsAsRead}
                  className='text-xs text-muted-foreground flex items-center gap-2'
                >
                  <EyeOff className='w-3 h-3' /> Als gelesen markieren
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {untippedOpenEventsByGroup.map((g) => (
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
