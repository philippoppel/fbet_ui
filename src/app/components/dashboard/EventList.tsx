'use client';

import {
  EventCard,
  type AiEventPayload,
} from '@/app/components/event/EventCard';
import type { MixedEvent } from '@/app/lib/types';
import { getSportIcon } from '@/app/lib/utils';

type EventListProps = {
  events: MixedEvent[];
  onProposeEvent: (eventId: string) => void;
  onCardAiCreate?: (payload: AiEventPayload) => void;
  disabled: boolean;
};

export function EventList({
  events,
  onProposeEvent,
  onCardAiCreate,
  disabled,
}: EventListProps) {
  if (events.length === 0) {
    return (
      <p className='text-sm text-muted-foreground text-center py-4'>
        Keine bevorstehenden Events gefunden.
      </p>
    );
  }

  return (
    <ul className='space-y-3 sm:space-y-4'>
      {/* HIER DIE ÄNDERUNG: (event) -> (event, index) */}
      {events.map((event, index) => {
        let displayBadge: string = event.sport || 'Event';
        let specificBadgeForAi: AiEventPayload['badge'] =
          event.sport as AiEventPayload['badge'];

        switch (event.sport?.toLowerCase()) {
          case 'ufc':
            displayBadge = 'UFC';
            specificBadgeForAi = 'UFC';
            break;
          case 'boxing':
          case 'boxen':
            displayBadge = 'Boxen';
            specificBadgeForAi = 'Boxen';
            break;
          case 'football':
          case 'fußball':
            displayBadge = 'Fußball';
            specificBadgeForAi = 'Fußball';
            break;
          default:
            break;
        }

        const icon = getSportIcon(event.sport);

        const handleCardAiRequest = () => {
          if (onCardAiCreate) {
            onCardAiCreate({
              title: event.title,
              subtitle: event.subtitle,
              badge: specificBadgeForAi,
            });
          }
        };

        return (
          <EventCard
            // HIER DIE ÄNDERUNG: Ein robuster Key, der immer eindeutig ist.
            key={event.id || `event-fallback-${index}-${event.title}`}
            title={event.title}
            subtitle={event.subtitle}
            disabled={disabled}
            // Die onClick-Logik muss auch den Fallback berücksichtigen, falls event.id nicht existiert
            onClick={() => onProposeEvent(event.id || `fallback-${index}`)}
            onAiCreateClick={onCardAiCreate ? handleCardAiRequest : undefined}
            badge={displayBadge}
            icon={icon}
          />
        );
      })}
    </ul>
  );
}
