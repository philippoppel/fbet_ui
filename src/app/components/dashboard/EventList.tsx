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
  onCardAiCreate?: (payload: AiEventPayload) => void; // Nimmt den Payload entgegen
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
      {events.map((event) => {
        // Badge-Logik bleibt erhalten, um den korrekten Badge-Typ für AiEventPayload zu bestimmen
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
            // displayBadge bleibt event.sport oder 'Event'
            // specificBadgeForAi bleibt event.sport (oder was auch immer MixedEvent.sport ist)
            break;
        }

        const icon = getSportIcon(event.sport);

        // Diese Funktion wird von der EventCard aufgerufen, wenn der AI-Button geklickt wird.
        // Sie ruft dann onCardAiCreate (aus AddEventDialog) mit dem spezifischen Payload auf.
        const handleCardAiRequest = () => {
          if (onCardAiCreate) {
            onCardAiCreate({
              title: event.title,
              subtitle: event.subtitle,
              badge: specificBadgeForAi, // Stellt sicher, dass der korrekte Typ verwendet wird
            });
          }
        };

        return (
          <EventCard
            key={event.id}
            title={event.title}
            subtitle={event.subtitle}
            disabled={disabled}
            onClick={() => onProposeEvent(event.id)}
            onAiCreateClick={onCardAiCreate ? handleCardAiRequest : undefined} // Gebe den Handler weiter
            badge={displayBadge}
            icon={icon}
          />
        );
      })}
    </ul>
  );
}
