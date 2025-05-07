import React from 'react';

interface FullscreenCenterProps {
  children: React.ReactNode;
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
      {children}
    </div>
  );
}
