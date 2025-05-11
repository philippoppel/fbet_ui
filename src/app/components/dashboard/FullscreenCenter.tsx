// src/app/components/ui/FullscreenCenter.tsx
'use client';

import React from 'react';
import Image from 'next/image';

interface FullscreenCenterProps {
  children?: React.ReactNode;
  className?: string;
}

export function FullscreenCenter({
  children,
  className,
}: FullscreenCenterProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center min-h-screen w-full text-center ${className || ''}`}
    >
      {/* Stylisches Lade-Logo */}
      <div className='relative w-20 h-20 mb-6 animate-pulse'>
        <Image
          src='/apple-touch-icon.png' // dein Logo (z. B. aus /public)
          alt='Fbet Logo'
          fill
          sizes='100px'
          className='object-contain drop-shadow-lg filter brightness-110'
        />
      </div>

      {/* Spinner oder Text */}
      <div className='text-muted-foreground text-sm animate-pulse'>
        Lädt Fbet…
      </div>
      {children}
    </div>
  );
}
