'use client';

import Link from 'next/link';
import { BarChartBig, LogOut, LogIn, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { UserOut } from '@/lib/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AppHeaderProps {
  user: UserOut | null;
  onLogout?: () => void;
}

export function AppHeader({ user, onLogout }: AppHeaderProps) {
  const firstName = user?.name?.split(' ')[0];
  const displayName = firstName || user?.email;

  return (
    <TooltipProvider delayDuration={100}>
      <header className='sticky top-0 z-50 w-full border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6 lg:px-8'>
        <div className='flex h-14 items-center'>
          {/* Logo-Link mit Tooltip, je nach Login-Zustand */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={user ? '/dashboard' : '/'}
                className='flex items-center space-x-2 transition-opacity hover:opacity-80'
              >
                <BarChartBig className='h-6 w-6 text-primary' />
                <span className='font-bold'>fbet</span>
              </Link>
            </TooltipTrigger>
            {user && (
              <TooltipContent side='bottom'>
                <p>Zum Dashboard</p>
              </TooltipContent>
            )}
          </Tooltip>

          {/* Aktionen rechts */}
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
    </TooltipProvider>
  );
}
