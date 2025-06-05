// src/app/components/layout/AppHeader.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  RefreshCw,
  Flame,
  EyeOff,
  Bell, // Icon für Benachrichtigungen AN
  BellOff, // Icon für Benachrichtigungen AUS / BLOCKIERT
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';
import { useAppRefresh } from '@/app/hooks/useAppRefresh';
import { GroupSidebar } from '@/app/components/dashboard/GroupSidebar';
import {
  UserOut,
  Group as GroupType,
  GroupWithOpenEvents,
} from '@/app/lib/types';
import {
  getGroupsWithOpenEvents,
  getMyTipsAcrossAllGroups,
} from '@/app/lib/api';

import {
  usePushNotifications,
  PushNotificationStatus,
} from '@/app/hooks/usePushNotifications';
import { toast } from 'sonner';

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
  const displayName = user?.name?.split(' ')[0] || user?.email || '';
  const { refresh, updateAvailable, online, isRefreshing } = useAppRefresh();
  const [showFullScreenLoader, setShowFullScreenLoader] = useState(false);

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
      try {
        const raw = localStorage.getItem(STORAGE_KEY_SEEN_NOTIFICATIONS);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return new Set(parsed);
        }
      } catch (e) {
        console.error('Fehler beim Parsen der Notification-IDs:', e);
      }
    }
    return new Set();
  });

  const {
    status: pushStatus,
    error: pushError,
    requestPermissionAndSubscribe,
    unsubscribeUser,
    // triggerTestNotification, // Bleibt hier, falls du es später für Debugging brauchst
    isSubscribed: isPushSubscribed,
    isLoading: isPushLoading,
    permissionDenied: isPushPermissionDenied,
  } = usePushNotifications();

  useEffect(() => {
    if (pushError) {
      toast.error(pushError, { duration: 6000 });
    }
  }, [pushError]);

  const fetchOpenEventsForHeader = useCallback(async () => {
    if (!user) return;
    const token = localStorage.getItem('fbet_token');
    if (!token) return;
    setIsLoadingOpenEvents(true);
    try {
      const data = await getGroupsWithOpenEvents(token);
      setGroupsWithOpenEventsData(data || []);
    } catch (error) {
      console.error('Fehler beim Laden offener Events:', error);
    } finally {
      setIsLoadingOpenEvents(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOpenEventsForHeader();
    const token = localStorage.getItem('fbet_token');
    if (!token) return;
    getMyTipsAcrossAllGroups(token)
      .then((allTips) => {
        const tipIds = new Set(allTips.map((tip) => tip.eventId));
        setUserTippedEventIdsAll(tipIds);
      })
      .catch((err) => console.error('Fehler beim Laden der Tipps:', err));
  }, [user?.id, fetchOpenEventsForHeader]);

  const untippedOpenEventsByGroup = useMemo(() => {
    return groupsWithOpenEventsData
      .map((group) => {
        const untipped = group.openEvents.filter(
          (e) => !userTippedEventIdsAll.has(Number(e.id))
        );
        return { ...group, openEvents: untipped };
      })
      .filter((g) => g.openEvents.length > 0);
  }, [groupsWithOpenEventsData, userTippedEventIdsAll]);

  const notificationCount = useMemo(() => {
    return untippedOpenEventsByGroup.reduce(
      (count, g) =>
        count +
        g.openEvents.filter((e) => !seenNotificationEventIds.has(e.id)).length,
      0
    );
  }, [untippedOpenEventsByGroup, seenNotificationEventIds]);

  const handleSelectAndCloseSheet = (groupId: number) => {
    onSelectGroup?.(groupId);
    setIsSheetOpen(false);
  };

  const handleRefreshClick = () => {
    console.log('[AppHeader] handleRefreshClick ausgelöst.');
    setShowFullScreenLoader(true);
    refresh();
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleMarkNotificationsAsRead = () => {
    const newSet = new Set(seenNotificationEventIds);
    untippedOpenEventsByGroup.forEach((g) =>
      g.openEvents.forEach((e) => newSet.add(e.id))
    );
    setSeenNotificationEventIds(newSet);
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        STORAGE_KEY_SEEN_NOTIFICATIONS,
        JSON.stringify(Array.from(newSet))
      );
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      fetchOpenEventsForHeader();
      const token = localStorage.getItem('fbet_token');
      if (!token) return;
      getMyTipsAcrossAllGroups(token)
        .then((allTips) => {
          const tipIds = new Set(allTips.map((tip) => tip.eventId));
          setUserTippedEventIdsAll(tipIds);
        })
        .catch((err) => console.error('Fehler beim Reload der Tipps:', err));
    }, 60_000);
    return () => clearInterval(interval);
  }, [fetchOpenEventsForHeader, user?.id]);

  const handleTogglePushNotifications = async () => {
    if (isPushSubscribed) {
      const success = await unsubscribeUser();
      if (success) {
        toast.info('Push-Benachrichtigungen deaktiviert.');
      }
    } else {
      const success = await requestPermissionAndSubscribe();
      if (success) {
        toast.success('Push-Benachrichtigungen aktiviert!');
        // triggerTestNotification(); // <<< HIER ENTFERNT
      } else {
        if (isPushPermissionDenied || Notification.permission === 'denied') {
          toast.warning(
            'Berechtigung für Benachrichtigungen blockiert. Bitte in den Browser-Einstellungen ändern.',
            { duration: 7000 }
          );
        }
      }
    }
  };

  const renderPushNotificationButton = () => {
    if (!user || pushStatus === PushNotificationStatus.NOT_SUPPORTED) {
      return null;
    }

    // Standard: Benachrichtigungen sind AUS (aber aktivierbar)
    let icon = <BellOff className='h-5 w-5 text-muted-foreground' />;
    let label = 'Push-Benachrichtigungen aktivieren';
    let tooltipText =
      'Push-Benachrichtigungen sind deaktiviert. Klicken zum Aktivieren.';
    let currentIsDisabled = isPushLoading;

    if (isPushSubscribed) {
      // Benachrichtigungen sind AN
      icon = <Bell className='h-5 w-5 text-primary' />; // Bell-Icon, farblich als "aktiv" markiert
      label = 'Push-Benachrichtigungen deaktivieren';
      tooltipText =
        'Push-Benachrichtigungen sind aktiviert. Klicken zum Deaktivieren.';
    } else if (isPushPermissionDenied) {
      // Benachrichtigungen sind BLOCKIERT
      icon = <BellOff className='h-5 w-5 text-destructive' />; // Rotes BellOff-Icon
      label = 'Push-Benachrichtigungen blockiert';
      tooltipText = 'Berechtigung blockiert. In Browser-Einstellungen ändern.';
      // Optional: Button hier explizit deaktivieren, falls gewünscht
      // currentIsDisabled = true;
    }
    // Der Fall SUPPORTED_NOT_SUBSCRIBED ist bereits durch die Standardwerte oben abgedeckt.

    if (isPushLoading) {
      label = isPushSubscribed ? 'Deaktiviere...' : 'Aktiviere...';
      // Optional: Hier könnte man auch ein Lade-Icon anzeigen statt Bell/BellOff
    }

    return (
      <TooltipProvider>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              aria-label={label}
              onClick={handleTogglePushNotifications}
              disabled={currentIsDisabled}
            >
              {icon}
            </Button>
          </TooltipTrigger>
          <TooltipContent side='bottom'>
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <header
      style={{
        top: 'env(safe-area-inset-top)',
      }}
      className='sticky z-50 w-full border-b bg-background/60 px-4 sm:px-6 lg:px-8 frosted-header'
    >
      <div className='flex h-14 items-center justify-between'>
        {/* LINKS: Burger + Logo */}
        <div className='flex items-center gap-2'>
          {user && myGroups.length > 0 && onSelectGroup && (
            <div className='block lg:hidden'>
              <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant='ghost' size='icon' aria-label='Menü öffnen'>
                    <Menu className='w-5 h-5' />
                  </Button>
                </SheetTrigger>
                <SheetContent side='left' className='w-[80vw] max-w-xs p-0'>
                  <SheetHeader>
                    <SheetTitle className='sr-only'>
                      Gruppenübersicht
                    </SheetTitle>
                  </SheetHeader>
                  <GroupSidebar
                    groups={myGroups}
                    selectedGroupId={selectedGroupId}
                    onSelectGroup={handleSelectAndCloseSheet}
                    isLoading={false}
                    error={null}
                    isCollapsed={false}
                    currentUserId={user.id}
                    onDeleteGroup={() => Promise.resolve()}
                  />
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
        </div>

        {/* RECHTS: Buttons */}
        <div className='flex items-center space-x-2 sm:space-x-3'>
          {user && myGroups.length > 0 && onSelectGroup && (
            <DropdownMenu
              onOpenChange={(open) => {
                if (!open) handleMarkNotificationsAsRead();
              }}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  aria-label='Offene Wetten'
                  className='relative'
                >
                  <Flame className='h-5 w-5 text-orange-500' />
                  {notificationCount > 0 && (
                    <span className='absolute -top-1 -right-1 text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 leading-none'>
                      {notificationCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-56'>
                <DropdownMenuItem
                  disabled
                  className='text-sm font-semibold px-2 pt-2 pb-1'
                >
                  Offene Wetten (
                  {untippedOpenEventsByGroup.reduce(
                    (sum, g) => sum + g.openEvents.length,
                    0
                  )}
                  )
                </DropdownMenuItem>
                {untippedOpenEventsByGroup.length > 0 && (
                  <DropdownMenuItem
                    onSelect={handleMarkNotificationsAsRead}
                    className='text-xs text-muted-foreground flex items-center gap-1.5 cursor-pointer px-2 py-1.5'
                  >
                    <EyeOff className='w-3.5 h-3.5' /> Alle als gelesen
                    markieren
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {untippedOpenEventsByGroup.length > 0 ? (
                  untippedOpenEventsByGroup.map((g) => (
                    <DropdownMenuItem
                      key={g.groupId}
                      onSelect={() => onSelectGroup?.(g.groupId)}
                      className='flex justify-between items-center px-2 py-1.5'
                    >
                      <span>{g.groupName}</span>
                      <span className='text-xs bg-orange-500 text-white rounded-full px-1.5 py-0.5 leading-none'>
                        {
                          g.openEvents.filter(
                            (e) => !seenNotificationEventIds.has(e.id)
                          ).length
                        }
                      </span>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem
                    disabled
                    className='text-sm text-muted-foreground px-2 py-1.5'
                  >
                    Keine offenen Tipps.
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* NEUER PUSH NOTIFICATION BUTTON WIRD HIER GERENDERT */}
          {renderPushNotificationButton()}

          <Button
            variant={updateAvailable ? 'default' : 'ghost'}
            size='icon'
            aria-label='App neu laden'
            onClick={handleRefreshClick}
            className='relative'
          >
            <RefreshCw
              className={`h-4 w-4 transition-transform ${
                updateAvailable || isRefreshing ? 'animate-spin' : ''
              }`}
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
      {showFullScreenLoader && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm'>
          <RefreshCw className='h-8 w-8 animate-spin text-primary' />
        </div>
      )}
    </header>
  );
}
