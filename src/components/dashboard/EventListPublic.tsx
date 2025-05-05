// src/components/landing/EventListPublic.tsx
'use client';

import { EventCard } from '@/components/event/EventCard'; // Importiere DEINE EventCard
import type { MixedEvent, UfcEventItem, BoxingScheduleItem } from '@/lib/types';

type EventListPublicProps = {
  events: MixedEvent[];
  onProposeEvent: (event: UfcEventItem | BoxingScheduleItem) => void; // Nimmt den Handler von der Seite entgegen
};

export function EventListPublic({
  events,
  onProposeEvent,
}: EventListPublicProps) {
  return (
    // Deine EventCard wird hier verwendet
    <ul className='space-y-4'>
      {events.map((event) => (
        <EventCard
          key={event.id}
          title={event.title}
          subtitle={event.subtitle}
          // Wir deaktivieren den Button hier nicht visuell für Gäste.
          // Die Logik liegt im onClick Handler der Seite.
          disabled={false}
          // Der Klick löst den Toast aus, der von der LandingPage kommt
          onClick={() => onProposeEvent(event.original)}
          badge={event.sport === 'ufc' ? 'UFC' : 'Boxen'}
          // Optional: Icon hinzufügen, falls gewünscht
          // icon={event.sport === 'ufc' ? <UfcIcon/> : <BoxingIcon/>}
        />
      ))}
    </ul>
  );
}
