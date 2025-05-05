// src/components/layout/FullscreenCenter.tsx
// (oder wo immer allgemeine Layout-Komponenten liegen)

import React from 'react';

interface FullscreenCenterProps {
  children: React.ReactNode;
  className?: string; // Optional: für zusätzliche Styling-Möglichkeiten
}

export function FullscreenCenter({
  children,
  className,
}: FullscreenCenterProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center min-h-screen p-4 text-center ${className || ''}`}
    >
      {/* Optional ein innerer Div, falls man max-width oder ähnliches braucht */}
      <div>{children}</div>
    </div>
  );
}
