'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BarChartBig,
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  Users,
  PlusCircle,
} from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/app/components/ui/button';
import { UserOut, Group } from '@/app/lib/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/app/components/ui/sheet';
import { GroupSidebar } from '@/app/components/dashboard/GroupSidebar';

interface AppHeaderProps {
  user: UserOut | null;
  onLogout?: () => void;
  myGroups?: Group[];
  selectedGroupId?: number | null;
  onSelectGroup?: (groupId: number) => void;
}

export function AppHeader({
  user,
  onLogout,
  myGroups = [],
  selectedGroupId = null,
  onSelectGroup,
}: AppHeaderProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const hasGroups = myGroups.length > 0;
  const displayName = user?.name?.split(' ')[0] || user?.email;

  const handleSelectAndClose = (groupId: number) => {
    onSelectGroup?.(groupId);
    setIsSheetOpen(false);
  };

  return (
    <header className='sticky top-0 z-50 w-full border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6 lg:px-8'>
      <div className='flex h-14 items-center'>
        {/* Burger Menu nur bei Gruppen und auf Mobile */}
        {hasGroups && (
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
                    <Users className='w-5 h-5 text-muted-foreground' /> Meine
                    Gruppen
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
                    currentUserId={undefined}
                    onDeleteGroup={function (groupId: number): Promise<void> {
                      throw new Error('Function not implemented.');
                    }}
                  />
                </div>
                <div className='p-4 border-t mt-auto bg-background'>
                  <Button size='sm' variant='ghost' asChild>
                    <Link href='groups/create'>
                      <PlusCircle className='w-4 h-4' /> Gruppe erstellen
                    </Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}
        {/* Logo */}
        <Link
          href={user ? '/dashboard' : '/public'}
          className='flex items-center space-x-2 hover:opacity-80 transition-opacity'
        >
          <img src='/icon0.svg' alt='Fbet Logo' className='h-8 w-auto' />
          <span className='text-lg font-bold tracking-tight'>fbet</span>
        </Link>
        {/* Rechts im Header */}
        <div className='ml-auto flex items-center space-x-2 sm:space-x-3'>
          {user && displayName ? (
            <>
              <span className='hidden text-sm text-muted-foreground sm:inline-block'>
                Hi, {displayName}!
              </span>
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
