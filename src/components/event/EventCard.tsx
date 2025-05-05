'use client';

import { FC, ReactNode } from 'react';
import { Button } from '@/components/ui/button'; // Stellen Sie sicher, dass der Pfad korrekt ist
import { cn } from '@/lib/utils'; // Stellen Sie sicher, dass der Pfad korrekt ist
import { PlusCircle } from 'lucide-react';

type Props = {
  title: string;
  subtitle?: string;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  icon?: ReactNode;
  badge?: 'UFC' | 'Boxen' | string;
};

export const EventCard: FC<Props> = ({
  title,
  subtitle,
  disabled,
  onClick,
  className,
  icon,
  badge,
}) => {
  // Funktion zum Abrufen der Badge-Klassen basierend auf dem Label
  const getBadgeClasses = (label: string) => {
    switch (label) {
      case 'UFC':
        return 'bg-red-200/10 text-red-500 ring-1 ring-red-400/30';
      case 'Boxen':
        return 'bg-blue-200/10 text-blue-500 ring-1 ring-blue-400/30';
      default:
        // Standard-Badge-Stil oder spezifische Stile für andere Labels
        return 'bg-gray-200/10 text-gray-500 ring-1 ring-gray-400/30'; // Beispiel für Standard
      // return 'bg-muted text-foreground'; // Alternative, wenn 'muted' definiert ist
    }
  };

  return (
    <li
      className={cn(
        // Basisstile für die Karte
        'rounded-xl border border-border bg-card/80 shadow-sm transition-all',
        // Hover-Effekte
        'hover:shadow-md hover:ring-1 hover:ring-ring/30',
        // Responsive Padding
        'px-4 py-3 sm:px-5 sm:py-4',
        className // Zusätzliche Klassen
      )}
    >
      {/* Hauptcontainer: Flexbox */}
      {/* Mobile: Spaltenlayout (Standard) */}
      {/* Desktop (sm+): Zeilenlayout, vertikal zentriert */}
      <div className='flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4'>
        {/* Linker Bereich: Icon + Badge */}
        {/* Feste Breite, schrumpft nicht */}
        {/* Kleinere Breite auf Mobile */}
        <div className='flex flex-col items-start justify-start gap-2 w-auto sm:w-[80px] flex-shrink-0'>
          {/* Icon nur anzeigen, wenn vorhanden */}
          {icon && <div className='text-muted-foreground'>{icon}</div>}
          {/* Badge nur anzeigen, wenn vorhanden */}
          {badge && (
            <span
              className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap', // `whitespace-nowrap` hinzugefügt
                getBadgeClasses(badge)
              )}
            >
              {badge}
            </span>
          )}
          {/* Sicherstellen, dass der Bereich auch ohne Icon/Badge einen Mindestplatz hat, wenn das Layout es erfordert */}
          {
            !icon && !badge && (
              <div className='h-[1px] w-[60px] sm:w-[80px]'></div>
            ) /* Optional: Platzhalter, falls benötigt */
          }
        </div>

        {/* Mittlerer Bereich: Textinhalt */}
        {/* Nimmt verfügbaren Platz ein, behandelt Überlauf */}
        <div className='flex-grow space-y-1 overflow-hidden'>
          <p className='font-medium text-sm leading-snug text-foreground break-words'>
            {title}
          </p>
          {/* Subtitle nur anzeigen, wenn vorhanden */}
          {subtitle && (
            <p className='text-xs sm:text-sm text-muted-foreground break-words leading-normal'>
              {subtitle} {/* Kleinere Schriftgröße für Subtitle auf Mobile? */}
            </p>
          )}
        </div>

        {/* Rechter Bereich: CTA Button */}
        {/* Schrumpft nicht */}
        {/* Mobile: Eigener Platz, am Ende ausgerichtet */}
        {/* Desktop: Teil der Zeile */}
        <div className='flex-shrink-0 mt-2 sm:mt-0 self-end sm:self-center'>
          <Button
            variant='listAction'
            size='sm'
            onClick={onClick}
            disabled={disabled}
            className='flex items-center' // Sicherstellen, dass Icon und Text zentriert sind
          >
            <PlusCircle className='w-4 h-4' />
            {/* Text nur auf größeren Bildschirmen (sm+) anzeigen */}
            <span className='hidden sm:inline ml-1.5'>Wette hinzufügen</span>
          </Button>
        </div>
      </div>
    </li>
  );
};
