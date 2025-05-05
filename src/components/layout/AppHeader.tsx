// src/components/layout/AppHeader.tsx
'use client';

import Link from 'next/link';
import { BarChartBig, LogOut, LogIn, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { UserOut } from '@/lib/types';

interface AppHeaderProps {
  user: UserOut | null;
  onLogout?: () => void;
}

export function AppHeader({ user, onLogout }: AppHeaderProps) {
  const firstName = user?.name?.split(' ')[0];
  const displayName = firstName || user?.email;

  return (
    <header className='sticky top-0 z-50 w-full border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6 lg:px-8'>
      {/* Kein 'container' mehr hier, sondern Padding direkt am Header */}
      <div className='flex h-14 items-center'>
        {/* Logo & Titel */}
        <Link
          href='/'
          // Optional: mr-0 lassen, wenn das Padding vom Header reicht
          className='flex items-center space-x-2 transition-opacity hover:opacity-80'
        >
          <BarChartBig className='h-6 w-6 text-primary' />
          <span className='font-bold'>fbet</span>
        </Link>

        {/* Navigations-/Aktionsbereich (bleibt gleich) */}
        <div className='ml-auto flex items-center space-x-2 sm:space-x-3'>
          {user && displayName ? (
            // Eingeloggter Zustand
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
            // Ausgeloggter Zustand
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
