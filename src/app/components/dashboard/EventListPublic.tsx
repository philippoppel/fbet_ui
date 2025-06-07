'use client';

import {
  EventCard,
  type AiEventPayload,
} from '@/app/components/event/EventCard';
import type {
  MixedEvent,
  UfcEventItem,
  BoxingScheduleItem,
  FootballEvent,
} from '@/app/lib/types';
import { getSportIcon } from '@/app/lib/utils';

type EventListPublicProps = {
  events: MixedEvent[];
  onProposeEvent: (
    originalEventData: UfcEventItem | BoxingScheduleItem | FootballEvent
  ) => void;
  onCardAiCreate?: (payload: AiEventPayload) => void;
};

export function EventListPublic({
  events,
  onProposeEvent,
  onCardAiCreate,
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
      {/* HIER DIE ÄNDERUNG: (event) -> (event, index) */}
      {events.map((event, index) => {
        const iconNode = getSportIcon(event.sport);
        // ... (restliche Logik bleibt gleich)
        let badgeText: string = event.sport || 'Event';
        // ...

        const handleAiCreate = () => {
          /* ... */
        };

        return (
          <EventCard
            // HIER DIE ÄNDERUNG: Robuster Key für diese Liste
            key={event.id || `public-event-${index}-${event.title}`}
            title={event.title}
            subtitle={event.subtitle}
            disabled={false}
            onClick={() => {
              if (event.original) {
                onProposeEvent(event.original);
              }
            }}
            badge={badgeText}
            icon={iconNode}
            onAiCreateClick={onCardAiCreate ? handleAiCreate : undefined}
          />
        );
      })}
    </ul>
  );
}
