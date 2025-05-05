// src/components/dashboard/EventList.tsx
'use client'; // Notwendig, da ein onClick-Handler als Prop empfangen wird

import { EventCard } from '@/components/event/EventCard'; // Importiere die bestehende EventCard
import type { MixedEvent, UfcEventItem, BoxingScheduleItem } from '@/lib/types'; // Pfad ggf. anpassen

// Definiere die Props
type EventListProps = {
  events: MixedEvent[]; // Die kombinierten und sortierten Events
  onProposeEvent: (event: UfcEventItem | BoxingScheduleItem) => void; // Callback-Funktion
  disabled: boolean; // Soll der "Wette hinzufügen"-Button deaktiviert sein?
};

export function EventList({
  events,
  onProposeEvent,
  disabled,
}: EventListProps) {
  // Optional: Füge hier Lade-/Fehlerzustände hinzu, wenn die Liste sie selbst behandeln soll.
  // Aktuell gehen wir davon aus, dass die übergeordnete Komponente (DashboardPage)
  // diese Liste nur rendert, wenn Events vorhanden und geladen sind.

  // Zeige eine Nachricht an, wenn die Liste leer ist (obwohl nicht geladen wird)
  // Diese Prüfung könnte auch in DashboardPage erfolgen.
  if (events.length === 0) {
    return (
      <p className='text-sm text-muted-foreground'>
        Keine bevorstehenden Events gefunden.
      </p>
    );
  }

  return (
    // Das ist der JSX-Code aus der DashboardPage für die Event-Liste
    <ul className='space-y-4'>
      {events.map((event) => (
        <EventCard
          key={event.id}
          title={event.title}
          subtitle={event.subtitle}
          // Deaktivierungsstatus von der übergeordneten Komponente übernehmen
          disabled={disabled}
          // Callback-Funktion für den Klick weitergeben
          onClick={() => onProposeEvent(event.original)}
          // Badge basierend auf der Sportart setzen
          badge={event.sport === 'ufc' ? 'UFC' : 'Boxen'}
          // Hier könntest du auch ein Icon übergeben, wenn gewünscht
          // icon={<PassendesIcon />}
        />
      ))}
    </ul>
  );
}
