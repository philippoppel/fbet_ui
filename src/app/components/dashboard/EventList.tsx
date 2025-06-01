// src/components/dashboard/EventList.tsx
'use client';

import { EventCard } from '@/app/components/event/EventCard';
import type { MixedEvent } from '@/app/lib/types'; // UfcEventItem und BoxingScheduleItem sind in MixedEvent.original enthalten

// Definiere die Props - onProposeEvent erwartet jetzt einen string (die Event-ID)
type EventListProps = {
  events: MixedEvent[];
  onProposeEvent: (eventId: string) => void; // GEÄNDERT: Erwartet jetzt event.id (string)
  disabled: boolean;
};

export function EventList({
  events,
  onProposeEvent,
  disabled,
}: EventListProps) {
  if (events.length === 0) {
    return (
      <p className='text-sm text-muted-foreground'>
        Keine bevorstehenden Events gefunden.
      </p>
    );
  }

  return (
    <ul className='space-y-4'>
      {events.map(
        (
          event // 'event' hier ist ein MixedEvent-Objekt
        ) => (
          <EventCard
            key={event.id} // Die eindeutige ID des MixedEvent
            title={event.title}
            subtitle={event.subtitle}
            disabled={disabled}
            onClick={() => onProposeEvent(event.id)} // GEÄNDERT: Übergibt jetzt event.id
            badge={event.sport === 'ufc' ? 'UFC' : 'Boxen'}
          />
        )
      )}
    </ul>
  );
}
