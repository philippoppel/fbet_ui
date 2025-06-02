// src/components/landing/EventListPublic.tsx
'use client';

import {
  EventCard,
  type AiEventPayload,
} from '@/app/components/event/EventCard';
import type {
  MixedEvent,
  UfcEventItem,
  BoxingScheduleItem,
  FootballEvent, // Importiere FootballEvent, da es Teil von MixedEvent.original ist
} from '@/app/lib/types';
import { getSportIcon } from '@/app/lib/utils';

type EventListPublicProps = {
  events: MixedEvent[];
  // Der Handler muss jetzt alle Typen von event.original akzeptieren können
  onProposeEvent: (
    originalEventData: UfcEventItem | BoxingScheduleItem | FootballEvent
  ) => void;
  // Optional: Wenn auch hier der AI-Button eine Aktion auslösen soll
  onCardAiCreate?: (payload: AiEventPayload) => void;
};

export function EventListPublic({
  events,
  onProposeEvent,
  onCardAiCreate, // Den neuen Handler empfangen
}: EventListPublicProps) {
  if (!events || events.length === 0) {
    return (
      <p className='text-sm text-muted-foreground text-center py-4'>
        Momentan keine öffentlichen Events verfügbar.
      </p>
    );
  }

  return (
    <ul className='space-y-4'>
      {events.map((event) => {
        const iconNode = getSportIcon(event.sport);
        let badgeText: string = event.sport || 'Event';
        let specificBadgeForAi: AiEventPayload['badge'] =
          event.sport as AiEventPayload['badge'];

        switch (event.sport?.toLowerCase()) {
          case 'ufc':
            badgeText = 'UFC';
            specificBadgeForAi = 'UFC';
            break;
          case 'boxing':
          case 'boxen':
            badgeText = 'Boxen';
            specificBadgeForAi = 'Boxen';
            break;
          case 'football':
          case 'fußball':
            badgeText = 'Fußball';
            specificBadgeForAi = 'Fußball';
            break;
          default:
            // badgeText bleibt event.sport oder 'Event'
            break;
        }

        const handleAiCreate = () => {
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
            key={event.id}
            title={event.title}
            subtitle={event.subtitle}
            // Für öffentliche Listen ist der Button meistens nicht disabled,
            // die Logik (z.B. Toast für Gäste) liegt im onProposeEvent Handler
            disabled={false}
            onClick={() => onProposeEvent(event.original)} // event.original ist jetzt vom korrekten Typ
            badge={badgeText}
            icon={iconNode} // Icon wird jetzt übergeben
            // AI-Button-Handler übergeben, falls vorhanden
            onAiCreateClick={onCardAiCreate ? handleAiCreate : undefined}
          />
        );
      })}
    </ul>
  );
}
