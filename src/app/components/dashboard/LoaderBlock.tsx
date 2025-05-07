// src/components/dashboard/LoaderBlock.tsx
// oder src/components/ui/LoaderBlock.tsx (je nach Organisation)

import { Loader2 } from 'lucide-react';

interface LoaderBlockProps {
  text: string;
  className?: string; // Optional: für zusätzliche Styling-Möglichkeiten
}

export function LoaderBlock({ text, className }: LoaderBlockProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-10 text-center text-muted-foreground ${className || ''}`}
      role='status'
      aria-live='polite'
    >
      <Loader2 className='h-6 w-6 animate-spin mb-3' />
      <span className='text-sm'>{text}</span>
    </div>
  );
}
