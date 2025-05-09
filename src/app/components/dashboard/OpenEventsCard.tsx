// src/app/components/dashboard/OpenEventsCard.tsx
'use client';

import type { Event as GroupEvent, UserOut } from '@/app/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { SingleOpenEventItem } from './SingleOpenEventItem';

interface OpenEventsCardProps {
  events: GroupEvent[];
  user: UserOut | null | undefined;
  groupCreatedBy: number | null | undefined;
  onInitiateDeleteEvent: (event: GroupEvent) => void;
  selectedTips: Record<number, string>;
  userSubmittedTips: Record<number, string>;
  resultInputs: Record<number, string>;
  isSubmittingTip: Record<number, boolean>;
  isSettingResult: Record<number, boolean>;
  onSelectTip: (eventId: number, option: string) => void;
  onSubmitTip: (eventId: number) => Promise<void>;
  onResultInputChange: (eventId: number, value: string) => void;
  onSetResult: (eventId: number, winningOption: string) => Promise<void>;
  onClearSelectedTip: (eventId: number) => void;
}

export function OpenEventsCard({
  events,
  user,
  groupCreatedBy,
  onInitiateDeleteEvent,
  selectedTips,
  userSubmittedTips,
  resultInputs,
  isSubmittingTip,
  isSettingResult,
  onSelectTip,
  onSubmitTip,
  onResultInputChange,
  onSetResult,
  onClearSelectedTip,
}: OpenEventsCardProps) {
  if (!events) {
    // ... (dein Fallback-Code)
  }

  const openEvents = events.filter((event) => event && !event.winningOption);

  // ----- ANFANG DEBUGGING FÜR KEYS -----
  if (openEvents && openEvents.length > 0) {
    console.log('[OpenEventsCard DEBUG] Überprüfe Event-IDs für Keys...');
    const eventIds = openEvents.map((e) => (e ? e.id : undefined)); // Sicherstellen, dass e existiert
    const uniqueEventIds = new Set(
      eventIds.filter((id) => id !== undefined && id !== null)
    ); // Nur gültige IDs für Eindeutigkeitsprüfung

    // Prüfe auf Duplikate
    const nonNullEventIds = eventIds.filter(
      (id) => id !== undefined && id !== null
    );
    if (uniqueEventIds.size !== nonNullEventIds.length) {
      console.error(
        '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'
      );
      console.error('DUPLIKATE EVENT IDs IN openEvents GEFUNDEN!');
      // Finde die Duplikate zum Loggen
      const idCounts = nonNullEventIds.reduce(
        (acc, id) => {
          acc[id as string | number] = (acc[id as string | number] || 0) + 1;
          return acc;
        },
        {} as Record<string | number, number>
      );
      const duplicates = Object.entries(idCounts).filter(
        ([id, count]) => count > 1
      );
      console.error('Doppelte IDs und ihre Anzahl:', duplicates);
      console.error(
        'Alle (gültigen) IDs sortiert:',
        [...nonNullEventIds].sort((a, b) => String(a).localeCompare(String(b)))
      );
      console.error(
        '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'
      );
    } else {
      console.log('[OpenEventsCard DEBUG] Keine doppelten Event-IDs gefunden.');
    }
    console.log(
      '[OpenEventsCard DEBUG] Alle (gefilterten) openEvents IDs für Keys:',
      eventIds
    );
  }
  // ----- ENDE DEBUGGING FÜR KEYS -----

  if (openEvents.length === 0) {
    // ... (dein Fallback-Code)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Offene Wetten</CardTitle>
      </CardHeader>
      <CardContent className='space-y-6'>
        {openEvents.map((event) => {
          // ----- ANFANG DEBUGGING PRO EVENT INNERHALB DER MAP -----
          if (!event || typeof event.id === 'undefined' || event.id === null) {
            console.warn(
              '[OpenEventsCard DEBUG] Ungültiges Event oder Event-ID in openEvents.map() übersprungen:',
              event
            );
            return null;
          }
          if (typeof event.id !== 'string' && typeof event.id !== 'number') {
            console.warn(
              '[OpenEventsCard DEBUG] Ungültiger Typ für event.id:',
              event.id,
              'Event:',
              event
            );
            // Optional: Hier könntest du entscheiden, das Element trotzdem mit einem Fallback-Key zu rendern oder es auch zu überspringen
            // return null; // Oder einen sicheren Fallback-Key generieren, falls das Rendern kritisch ist
          }
          // ----- ENDE DEBUGGING PRO EVENT INNERHALB DER MAP -----

          return (
            <SingleOpenEventItem
              key={event.id} // Der Key, der Probleme machen könnte
              event={event}
              user={user}
              groupCreatedBy={groupCreatedBy}
              onInitiateDeleteEvent={onInitiateDeleteEvent}
              selectedTips={selectedTips}
              userSubmittedTips={userSubmittedTips}
              resultInputs={resultInputs}
              isSubmittingTip={isSubmittingTip}
              isSettingResult={isSettingResult}
              onSelectTip={onSelectTip}
              onSubmitTip={onSubmitTip}
              onResultInputChange={onResultInputChange}
              onSetResult={onSetResult}
              onClearSelectedTip={onClearSelectedTip}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}
