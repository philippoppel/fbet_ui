'use client';

import type {
  Event as GroupEvent,
  UserOut,
  AllTipsPerEvent,
} from '@/app/lib/types'; // NEU: AllTipsPerEvent explizit importieren (optional, wenn schon global verfügbar)
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Eye } from 'lucide-react';

type SubmittedOpenEventsCardProps = {
  events: GroupEvent[];
  user: UserOut;
  userSubmittedTips: Record<number, string>;
  allTipsPerEvent: AllTipsPerEvent; // Typ ist hier korrekt
};

export default function SubmittedOpenEventsCard({
  events,
  user,
  userSubmittedTips,
  allTipsPerEvent,
}: SubmittedOpenEventsCardProps) {
  // Filtert Events, die offen sind UND für die der aktuelle Benutzer einen Tipp abgegeben hat.
  const submittedEvents = events.filter(
    (e) => e && !e.winningOption && userSubmittedTips[e.id] !== undefined // Sicherstellen, dass ein Tipp existiert
  );

  if (submittedEvents.length === 0) {
    return null; // Keine relevanten Events zum Anzeigen
  }

  return (
    <Card className='bg-muted/30 border border-border rounded-xl shadow-sm'>
      <CardHeader className='flex flex-row items-center gap-2'>
        {/* Geändert zu flex-row für bessere Ausrichtung von Icon und Titel */}
        <Eye className='h-5 w-5 text-blue-500 dark:text-blue-300 flex-shrink-0' />
        {/* flex-shrink-0 hinzugefügt */}
        <CardTitle className='text-base sm:text-lg font-semibold text-foreground'>
          Meine Tipps für offene Wetten
        </CardTitle>
      </CardHeader>

      <CardContent className='space-y-6'>
        {submittedEvents.map((event) => {
          const otherTipsForThisEvent =
            allTipsPerEvent[event.id]?.filter((t) => t.userId !== user.id) ||
            []; // Tipps anderer User für dieses Event

          return (
            <div
              key={event.id}
              className='rounded-lg border border-border bg-card p-4 sm:p-5 space-y-3 shadow-sm hover:shadow-md transition-shadow' // Etwas mehr space-y
            >
              <div className='space-y-1'>
                <h4 className='text-sm font-semibold text-foreground'>
                  {event.title}
                </h4>
                {event.question && ( // Anzeige der Frage, falls vorhanden
                  <p className='text-xs text-muted-foreground italic'>
                    {event.question}
                  </p>
                )}
                <p className='text-sm text-muted-foreground pt-1'>
                  Deine Antwort: <strong>{userSubmittedTips[event.id]}</strong>
                </p>
              </div>

              {/* Zeige "Tipps der anderen" nur, wenn es tatsächlich andere Tipps gibt */}
              {otherTipsForThisEvent.length > 0 && (
                <div className='pt-3 border-t border-border/60 text-sm'>
                  {/* border-border/60 für etwas subtilere Linie */}
                  <p className='mb-1.5 text-muted-foreground font-medium text-xs uppercase tracking-wider'>
                    {/* Etwas kleiner und uppercase */}
                    Tipps der anderen:
                  </p>
                  <ul className='text-sm space-y-1.5'>
                    {/* Etwas mehr Abstand in der Liste */}
                    {otherTipsForThisEvent.map((t) => (
                      <li
                        key={t.userId}
                        className='flex justify-between items-center'
                      >
                        {/* items-center hinzugefügt */}
                        <span className='text-muted-foreground'>
                          {t.userName || `User ${t.userId}`}
                        </span>
                        <Badge variant='secondary' className='font-normal'>
                          {/* secondary und font-normal für subtileren Look */}
                          {t.selectedOption}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
