// src/app/lib/utils.tsx (oder uiHelpers.tsx etc. - WICHTIG: .tsx Endung)

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ReactNode } from 'react';
import {
  // Icons, die in den Funktionen verwendet werden:
  HelpCircle,
  Flame,
  Hand, // Ersatz für BoxingGlove
  Volleyball, // Ersatz für SoccerBall
  Dumbbell,
  ListTree,
  Zap,
  Dices,
  ShieldQuestion,
  // Weitere importierte Icons (ggf. für andere Funktionen oder zukünftige Nutzung):
  Sword,
  Medal,
  Trophy,
  ShieldBan,
} from 'lucide-react';

export function getSportIcon(sport?: string | null): ReactNode {
  if (!sport) {
    return <HelpCircle className='h-5 w-5' />;
  }

  switch (sport.toLowerCase()) {
    case 'ufc':
      return <Flame className='h-5 w-5 text-red-500' />;
    case 'boxing':
    case 'boxen':
      return <Hand className='h-5 w-5 text-blue-500' />; // Hand als Ersatz für BoxingGlove
    case 'football':
    case 'fußball':
      return <Volleyball className='h-5 w-5 text-green-500' />; // Futbol statt SoccerBall
    // Füge hier weitere Sportarten und deren Icons hinzu
    // case 'basketball':
    //   return <IconNameFürBasketball className="h-5 w-5 text-orange-500" />;
    default:
      return <Dumbbell className='h-5 w-5' />;
  }
}

export function getCategoryIcon(category?: string): ReactNode {
  if (!category) {
    return <ListTree size={18} />;
  }
  switch (category.toLowerCase()) {
    case 'ufc':
      return <Flame size={18} />;
    case 'boxen':
      return <Hand size={18} />; // Hand als Ersatz für BoxingGlove
    case 'fußball':
      return <Volleyball size={18} />; // Futbol statt SoccerBall
    case 'formel 1':
      return <Zap size={18} />;
    case 'darts':
      return <Dices size={18} />;
    default:
      return <ShieldQuestion size={18} />;
  }
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
