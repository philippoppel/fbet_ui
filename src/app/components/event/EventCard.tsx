'use client';

import { FC, ReactNode } from 'react';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/lib/utils';
import { PlusCircle, Bot } from 'lucide-react';

export type AiEventPayload = {
  title: string;
  subtitle?: string;
  badge?: 'UFC' | 'Boxen' | 'Fußball' | string;
};

type EventCardProps = {
  title: string;
  subtitle?: string;
  disabled?: boolean;
  onClick?: () => void;
  onAiCreateClick?: (payload: AiEventPayload) => void;
  className?: string;
  icon?: ReactNode;
  badge?: 'UFC' | 'Boxen' | 'Fußball' | string;
};

export const EventCard: FC<EventCardProps> = ({
  title,
  subtitle,
  disabled,
  onClick,
  onAiCreateClick,
  className,
  icon,
  badge,
}) => {
  const getBadgeClasses = (label: string | undefined) => {
    switch (label) {
      case 'UFC':
        return 'bg-red-200/10 text-red-500 ring-1 ring-red-400/30';
      case 'Boxen':
        return 'bg-blue-200/10 text-blue-500 ring-1 ring-blue-400/30';
      case 'Fußball':
        return 'bg-green-200/10 text-green-500 ring-1 ring-green-400/30';
      default:
        return 'bg-gray-200/10 text-gray-500 ring-1 ring-gray-400/30';
    }
  };

  const handleAiButtonClick = () => {
    if (onAiCreateClick) {
      onAiCreateClick({
        title,
        subtitle,
        badge,
      });
    }
  };

  return (
    <li
      className={cn(
        'rounded-xl border border-border bg-card/80 shadow-sm transition-all',
        'hover:shadow-md hover:ring-1 hover:ring-ring/30',
        'px-4 py-3 sm:px-5 sm:py-4',
        className
      )}
    >
      <div className='flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4'>
        <div className='flex flex-col items-start justify-start gap-2 w-auto sm:w-[80px] flex-shrink-0'>
          {icon && <div className='text-muted-foreground'>{icon}</div>}
          {badge && (
            <span
              className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap',
                getBadgeClasses(badge)
              )}
            >
              {badge}
            </span>
          )}
          {!icon && !badge && (
            <div className='h-[1px] w-[60px] sm:w-[80px]'></div>
          )}
        </div>

        <div className='flex-grow space-y-1 overflow-hidden'>
          <p className='font-medium text-sm leading-snug text-foreground break-words'>
            {title}
          </p>
          {subtitle && (
            <p className='text-xs sm:text-sm text-muted-foreground break-words leading-normal'>
              {subtitle}
            </p>
          )}
        </div>

        <div className='flex-shrink-0 mt-2 sm:mt-0 self-end sm:self-center flex flex-col sm:flex-row gap-2 items-end sm:items-center'>
          {onAiCreateClick && (
            <Button
              variant='outline'
              size='sm'
              onClick={handleAiButtonClick}
              disabled={disabled}
              className='flex items-center w-full sm:w-auto justify-center'
              title='AI-Wettvorschlag für dieses Event generieren'
            >
              <Bot className='w-4 h-4 text-purple-500' />
              <span className='hidden sm:inline ml-1.5'>AI-Tipp</span>
              <span className='sm:hidden ml-1.5'>AI</span>
            </Button>
          )}

          {onClick && (
            <Button
              variant='listAction' // Annahme: listAction ist eine definierte Variante
              size='sm'
              onClick={onClick}
              disabled={disabled}
              className='flex items-center w-full sm:w-auto justify-center'
              title='Event auswählen oder Wette manuell hinzufügen'
            >
              <PlusCircle className='w-4 h-4' />
              <span className='hidden sm:inline ml-1.5'>Wette hinzufügen</span>
              <span className='sm:hidden ml-1.5'>Tippen</span>
            </Button>
          )}
        </div>
      </div>
    </li>
  );
};
