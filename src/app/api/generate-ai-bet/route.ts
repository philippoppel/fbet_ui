// src/app/api/generate-ai-bet/route.ts

import { Groq } from 'groq-sdk';
import { NextRequest, NextResponse } from 'next/server';
import {
  addDays,
  fetchAndParseOpenLigaCompetition,
  fetchAndParseAustriaMatchesOpenLiga,
} from '@/app/api/services/football_schedule'; // Pfade anpassen

import { fetchAndParseBoxingSchedule } from '@/app/api/services/espn_scraper'; // Pfade anpassen
import { fetchAndParseUfcSchedule } from '@/app/api/services/ufc_calendar'; // Pfade anpassen
import type {
  BoxingScheduleItem,
  FootballEvent,
  UfcEventItem,
} from '@/app/lib/types';
import { AiEventPayload } from '@/app/components/event/EventCard'; // Pfade anpassen
// Importiere den Payload-Typ von EventCard.tsx
import { extractAIFieldsFromServer } from './utils';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

interface GenericEvent {
  type: 'football' | 'boxing' | 'ufc' | 'unknown'; // "unknown" für generische Payloads
  originalEventType:
    | 'FootballEvent'
    | 'BoxingScheduleItem'
    | 'UfcEventItem'
    | 'CardPayload' // Markierung für Events aus der EventCard
    | 'unknown';
  competition?: string;
  date: string; // ISO-8601 UTC
  eventName?: string;
  homeTeam?: string;
  awayTeam?: string;
  status?: string;
  location?: string | null;
  fighter1?: string;
  fighter2?: string;
  subtitle?: string; // Hinzugefügt für mehr Kontext aus CardPayload
  originalObject: any;
  [key: string]: any;
}

// ... (OPEN_LIGA_COMPETITIONS, AUSTRIA_TEAM_ID_OPENLIGA bleiben gleich) ...
const OPEN_LIGA_COMPETITIONS: Record<
  string,
  { shortcut: string; season: string }
> = {
  nla_24_25: { shortcut: 'nla', season: '2024' },
  cl_24_25: { shortcut: 'ucl2024', season: '2024' },
  kwm_25: { shortcut: 'kwm', season: '2025' },
};
const AUSTRIA_TEAM_ID_OPENLIGA = '148';

function ensureIsoDateString(dateStr: string | null | undefined): string {
  if (!dateStr) return new Date(0).toISOString(); // Standard-Fallback für "unbekannt"
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch (e) {
    /* Fall through */
  }
  try {
    const d = new Date(
      dateStr +
        (dateStr.match(/^\w+\s\d+$/) ? `, ${new Date().getFullYear()}` : '')
    );
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch (e) {
    /* Fall through */
  }
  console.warn(
    `[ensureIsoDateString] Konnte Datum nicht zuverlässig parsen: "${dateStr}".`
  );
  return new Date(0).toISOString(); // Sicherer Fallback für "unbekannt"
}

function formatEventForAIContext(event: GenericEvent): string {
  const isCardPayload = event.originalEventType === 'CardPayload';
  const eventDateObject = new Date(event.date);
  let eventDateFormatted = 'Datum nicht spezifiziert (demnächst erwartet)';

  if (
    event.date !== new Date(0).toISOString() &&
    !isNaN(eventDateObject.getTime()) &&
    eventDateObject.getFullYear() > 1970
  ) {
    eventDateFormatted = eventDateObject.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Vienna', // Oder deine Zielzeitzone
    });
  } else if (isCardPayload) {
    // Für CardPayloads ist das Datum oft nicht bekannt und wird als "aktuell" angenommen
    eventDateFormatted =
      'Das genaue Datum ist nicht bekannt, nimm an, es ist ein bevorstehendes Event.';
  }

  let context = `Event-Typ: ${event.type}\nDatum: ${eventDateFormatted}`;

  if (event.type === 'football') {
    if (event.competition) context += `\nWettbewerb: ${event.competition}`;
    // Für CardPayload, wo Teams ggf. im Titel sind
    if (event.homeTeam && event.awayTeam)
      context += `\nTeams: ${event.homeTeam} gegen ${event.awayTeam}`;
    else if (event.eventName) context += `\nSpiel: ${event.eventName}`; // Fallback
    if (event.status) context += `\nStatus: ${event.status}`;
  } else if (event.type === 'boxing' || event.type === 'ufc') {
    if (event.eventName) context += `\nEvent-Name: "${event.eventName}"`;
    if (event.fighter1 && event.fighter2) {
      context += `\nKampf: ${event.fighter1} gegen ${event.fighter2}`;
    } else if (event.eventName && event.eventName.includes(' vs ')) {
      context += `\nKampf (aus Event-Name): ${event.eventName}`;
    }
    if (event.location) context += `\nOrt: ${event.location}`;
  } else if (event.type === 'unknown' || isCardPayload) {
    // Allgemeiner Fall für CardPayload
    if (event.eventName) context += `\nEvent-Titel: "${event.eventName}"`;
    if (event.subtitle) context += `\nZusatzinfo: "${event.subtitle}"`;
    if (event.originalObject?.badge)
      context += `\nKategorie/Badge: "${event.originalObject.badge}" (Hilfestellung für die Sportart-Annahme)`;
  }
  return context;
}

// ... (ParsedAIBet, extractAIFieldsFromServer bleiben gleich) ...
interface ParsedAIBet {
  title: string;
  question: string;
  description: string;
  options: string[];
  wildcard_prompt?: string;
}

function extractDateFromSubtitle(subtitle: string | undefined): string {
  if (!subtitle) return new Date(0).toISOString();

  const dateMatch = subtitle.match(
    /(\d{2})\.(\d{2})\.(\d{4}),\s*(\d{2}):(\d{2})/
  );
  if (dateMatch) {
    const [, day, month, year, hour, minute] = dateMatch;
    const parsedDate = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute)
    );
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
  }

  // Fallback
  return new Date(0).toISOString();
}

// HTTP-Methode von GET auf POST ändern
export async function POST(req: NextRequest) {
  try {
    let eventToBetOn: GenericEvent;
    let eventSource: 'random' | 'payload' = 'random'; // Um zu wissen, woher die Daten kamen

    let requestBody: AiEventPayload | null = null;
    try {
      requestBody = await req.json();
    } catch (e) {
      // Kein Body oder kein valides JSON, fahre fort mit Random-Auswahl
      console.log(
        '[generate-ai-bet POST] Kein (valider) JSON-Body empfangen, wähle zufälliges Event.'
      );
    }

    if (requestBody && requestBody.title) {
      console.log(
        '[generate-ai-bet POST] Event-Daten aus Request-Body erhalten:',
        requestBody
      );
      eventSource = 'payload';
      let type: GenericEvent['type'] = 'unknown';
      if (requestBody.badge) {
        const badgeLower = requestBody.badge.toLowerCase();
        if (badgeLower.includes('ufc')) type = 'ufc';
        else if (badgeLower.includes('boxen') || badgeLower.includes('boxing'))
          type = 'boxing';
        else if (
          badgeLower.includes('fußball') ||
          badgeLower.includes('football')
        )
          type = 'football';
      }

      eventToBetOn = {
        type: type,
        originalEventType: 'CardPayload',
        date: extractDateFromSubtitle(requestBody.subtitle),
        eventName: requestBody.title,
        subtitle: requestBody.subtitle,
        homeTeam:
          type === 'football' && requestBody.title.includes(' vs ')
            ? requestBody.title.split(' vs ')[0].trim()
            : undefined,
        awayTeam:
          type === 'football' && requestBody.title.includes(' vs ')
            ? requestBody.title.split(' vs ')[1].trim()
            : undefined,
        fighter1:
          type === 'ufc' && requestBody.title.includes(' vs ')
            ? requestBody.title.split(' vs ')[0].trim()
            : undefined,
        fighter2:
          type === 'ufc' && requestBody.title.includes(' vs ')
            ? requestBody.title.split(' vs ')[1].trim()
            : undefined,
        originalObject: requestBody,
      };
    } else {
      // Fallback: Zufälliges Event auswählen (bisherige Logik)
      console.log(
        '[generate-ai-bet POST] Kein Payload, wähle zufälliges Event.'
      );
      const { searchParams } = new URL(req.url); // Für 'days' Parameter, falls weiterhin unterstützt
      const daysToLookAhead = Number(searchParams.get('days') ?? '30');
      const days =
        Number.isFinite(daysToLookAhead) &&
        daysToLookAhead > 0 &&
        daysToLookAhead <= 90
          ? daysToLookAhead
          : 30;

      const dateFrom = new Date();
      dateFrom.setUTCHours(0, 0, 0, 0);
      const dateTo = addDays(new Date(dateFrom), days - 1);
      dateTo.setUTCHours(23, 59, 59, 999);

      // ... (Logik zum Fetchen und Mappen von Football, Boxing, UFC Events bleibt hier gleich) ...
      const eventPromises: Promise<GenericEvent[]>[] = [];

      const footballPromises: Promise<FootballEvent[]>[] = [];
      for (const key in OPEN_LIGA_COMPETITIONS) {
        const comp = OPEN_LIGA_COMPETITIONS[key];
        footballPromises.push(
          fetchAndParseOpenLigaCompetition(
            comp.shortcut,
            comp.season,
            dateFrom,
            dateTo
          )
        );
      }
      footballPromises.push(
        fetchAndParseAustriaMatchesOpenLiga(
          AUSTRIA_TEAM_ID_OPENLIGA,
          dateFrom,
          dateTo
        )
      );

      eventPromises.push(
        Promise.all(footballPromises).then((results) =>
          results.flat().map(
            (fe): GenericEvent => ({
              type: 'football' as const,
              originalEventType: 'FootballEvent' as const,
              date: fe.matchDate, // Sollte bereits ISO String sein
              competition: fe.competition,
              homeTeam: fe.homeTeam,
              awayTeam: fe.awayTeam,
              status: fe.status,
              originalObject: fe,
            })
          )
        )
      );

      eventPromises.push(
        fetchAndParseBoxingSchedule()
          .then((boxingEvents: BoxingScheduleItem[]) =>
            boxingEvents
              .map((be): GenericEvent => {
                const dateString = be.parsedDate || be.date;
                return {
                  type: 'boxing' as const,
                  originalEventType: 'BoxingScheduleItem' as const,
                  date: ensureIsoDateString(dateString),
                  eventName: be.details || 'Unbekannter Boxkampf',
                  location: be.location || null,
                  originalObject: be,
                };
              })
              .filter((beGeneric) => {
                const eventDate = new Date(beGeneric.date);
                return (
                  !isNaN(eventDate.getTime()) &&
                  eventDate.getFullYear() > 1970 &&
                  eventDate >= dateFrom &&
                  eventDate <= dateTo
                );
              })
          )
          .catch((err) => {
            console.error('Fehler beim Abrufen/Mappen von Box-Events:', err);
            return [];
          })
      );

      eventPromises.push(
        fetchAndParseUfcSchedule()
          .then((ufcEvents: UfcEventItem[]) =>
            ufcEvents
              .map(
                (ue): GenericEvent => ({
                  type: 'ufc' as const,
                  originalEventType: 'UfcEventItem' as const,
                  date: ensureIsoDateString(ue.dtstart),
                  eventName: ue.summary || 'Unbekanntes UFC Event',
                  location: ue.location || null,
                  originalObject: ue,
                })
              )
              .filter((ueGeneric) => {
                const eventDate = new Date(ueGeneric.date);
                return (
                  !isNaN(eventDate.getTime()) &&
                  eventDate.getFullYear() > 1970 &&
                  eventDate >= dateFrom &&
                  eventDate <= dateTo
                );
              })
          )
          .catch((err) => {
            console.error('Fehler beim Abrufen/Mappen von UFC-Events:', err);
            return [];
          })
      );

      const nestedEventResults = await Promise.all(eventPromises);
      let allEventsAsGeneric = nestedEventResults.flat();

      const uniqueGenericEventsMap = new Map<string, GenericEvent>();
      for (const event of allEventsAsGeneric) {
        let key = `${event.type}:${new Date(event.date).toISOString().substring(0, 10)}:`; // Normalisiere Datum für Key
        if (event.type === 'football') {
          key += `${(event.homeTeam || 'N/A').toLowerCase()}:${(event.awayTeam || 'N/A').toLowerCase()}`;
        } else {
          key += (event.eventName || 'unknown_event')
            .toLowerCase()
            .replace(/\s+/g, '-');
        }
        if (!uniqueGenericEventsMap.has(key)) {
          uniqueGenericEventsMap.set(key, event);
        }
      }
      const relevantEvents = Array.from(uniqueGenericEventsMap.values()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      if (relevantEvents.length === 0) {
        return NextResponse.json(
          {
            message:
              'Keine passenden Events für einen zufälligen Vorschlag gefunden.',
          },
          { status: 404 }
        );
      }
      const randomIndex = Math.floor(Math.random() * relevantEvents.length);
      eventToBetOn = relevantEvents[randomIndex];
    }

    // Gemeinsame Logik für AI Prompt Erstellung und Aufruf
    const eventContextString = formatEventForAIContext(eventToBetOn);
    console.log(
      `[generate-ai-bet POST] Event-Kontext für AI (Quelle: ${eventSource}):\n`,
      eventContextString
    );

    const systemContent = `Du bist ein extrem kreativer und humorvoller Assistent, der sich auf Deutsch sehr ungewöhnliche, lustige und spezifische Wettideen für Freundesgruppen ausdenkt, die sich auf ein konkretes Sportereignis beziehen.
Die Sportart des Events wird im Kontext genannt (z.B. Fußball, Boxen, UFC). Wenn der Typ "unknown" oder das Datum vage ist (z.B. "Datum nicht spezifiziert"), versuche aus dem Titel und Zusatzinfos eine plausible Annahme zur Sportart zu treffen oder eine allgemeinere, kreative Wette zu formulieren, die zum Event-Titel passt.
Deine Wetten gehen immer über einfache Sieg- oder Ergebniswetten hinaus. Sie beziehen sich auf kuriose Details, spezifische Vorkommnisse oder Nebenaspekte des Events.
Halte dich **strikt** an das vorgegebene Ausgabeformat:
Titel: [Wettfrage]
Beschreibung: [Details]
Optionen:
[Option 1]
[Option 2]
[usw.]
Gib **nur** diesen Text zurück, ohne zusätzliche Einleitungen, Erklärungen oder Markdown, außer für die Feldnamen selbst.`;

    const eventNameForPrompt =
      eventToBetOn.type === 'football'
        ? `${eventToBetOn.homeTeam || 'Heimteam'} gegen ${eventToBetOn.awayTeam || 'Auswärtsteam'}`
        : eventToBetOn.eventName || 'das Event';

    const dateForPrompt =
      eventToBetOn.date === new Date(0).toISOString() ||
      eventToBetOn.originalEventType === 'CardPayload'
        ? 'demnächst (genaues Datum nicht spezifiziert)'
        : new Date(eventToBetOn.date).toLocaleDateString('de-DE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });

    const userContent = `Du bist ein extrem kreativer und humorvoller Assistent, der sich auf Deutsch sehr ungewöhnliche, lustige und spezifische Wettideen für Freundesgruppen ausdenkt, die sich auf ein konkretes Sportereignis beziehen.

Die Sportart des Events wird im Kontext genannt (z.B. Fußball, Boxen, UFC). Wenn der Typ "unknown" oder das Datum vage ist (z.B. "Datum nicht spezifiziert"), versuche aus dem Titel und Zusatzinfos eine plausible Annahme zur Sportart zu treffen oder eine allgemeinere, kreative Wette zu formulieren, die zum Event-Titel passt.

Deine Wetten gehen immer über einfache Sieg- oder Ergebniswetten hinaus. Sie beziehen sich auf kuriose Details, spezifische Vorkommnisse oder Nebenaspekte des Events.

Gib die Antwort **nur** in diesem exakten Format zurück, ohne zusätzliche Erklärungen, Einleitungen oder Markdown (außer für die Feldnamen selbst):

---

Titel: [Wettfrage]

Beschreibung: [Details zur Wette — mindestens **2 vollständige, interessante Sätze**, die das Event spannend machen und den Kontext erklären. Diese Beschreibung darf NIEMALS leer sein. Wenn du keine Beschreibung generieren kannst, liefere KEINE Antwort.]

Optionen:

[Option 1]

[Option 2]

[usw.]

Wildcard: [Zusatzfrage, die unabhängig von den Optionen beantwortet werden kann.]

---

Beziehe dich im Titel und in der Beschreibung **klar und eindeutig** auf das folgende Sportereignis:

Sportereignis-Details:
${eventContextString}

---

Spezielle Hinweise:

1. Der 'Titel' soll eine **ausgefallene Wettfrage** sein, passend zur Sportart und Event-Details.  
   Beispiel: "Endet der Hauptkampf ${eventToBetOn.fighter1 && eventToBetOn.fighter2 ? eventToBetOn.fighter1 + ' vs ' + eventToBetOn.fighter2 : eventNameForPrompt} durch Knockout/TKO?"

2. Die 'Beschreibung' MUSS mindestens **2 vollständige Sätze** enthalten, die das Event auch für Laien spannend erklären. Erwähne den Eventnamen (${eventNameForPrompt}) und ggf. das Datum ("${dateForPrompt}").  
   Beispiele für Satzanfänge:  
   - "Bei ${eventNameForPrompt} treffen zwei der explosivsten Kämpfer der Gewichtsklasse aufeinander."  
   - "Das Event verspricht jede Menge Action, da ${eventToBetOn.fighter1 || 'Kämpfer A'} für seine aggressiven Takedowns bekannt ist."

3. Die 'Optionen' müssen die Frage im 'Titel' **direkt und eindeutig** beantworten. Keine vagen Optionen.

4. **Beispiel für eine komplette gute Antwort:**

---

Titel: Wie viele erfolgreiche Takedowns wird Khamzat Chimaev in seinem Kampf bei UFC Fight Night: Usman vs Buckley landen?

Beschreibung: Bei UFC Fight Night: Usman vs Buckley treffen zwei herausragende Kämpfer aufeinander. Khamzat Chimaev ist bekannt für seinen dominanten Ringerstil und seine explosiven Takedowns. Die Fans dürfen gespannt sein, wie oft er seinen Gegner im Laufe des Kampfes zu Boden bringt.

Optionen:

[0-1]

[2-3]

[Mehr als 3]

Wildcard: Wie viele Sekunden dauert der Kampf insgesamt an?

---

5. **Regel zur Validierung:**  
→ **Wenn die 'Beschreibung' leer ist oder weniger als 2 vollständige Sätze enthält, ist die Antwort UNGÜLTIG. Gib in diesem Fall KEINE Antwort zurück!**

6. **Kein zusätzliches Blabla!** Nur exakt das vorgegebene Format.

7. Falls dir für die 'Beschreibung' nur wenige Informationen zur Verfügung stehen (z.B. nur ein Event-Titel und keine bekannten Kämpfer oder Details), erfinde eine unterhaltsame und plausible Beschreibung, die das Event für Freunde spannend und witzig wirken lässt. Du darfst fantasievolle Elemente ergänzen, um mindestens 2 vollständige Sätze zu erzeugen.

---

Zusatzhinweis: Du darfst kreativ sein und humorvolle oder unerwartete Aspekte in die Wette einbauen — Hauptsache, sie sind **klar und eindeutig beziehbar auf das Event**.

`;

    const response = await groq.chat.completions.create({
      model: 'llama3-70b-8192',
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: userContent },
      ],
      temperature: 1.2, // Ggf. Temperatur leicht erhöhen für mehr Kreativität bei vagen Inputs
    });

    const rawAIMessage = response.choices?.[0]?.message?.content;
    const parsedFields = extractAIFieldsFromServer(rawAIMessage || '');

    if (
      !parsedFields.title ||
      !parsedFields.options ||
      parsedFields.options.length < 2 ||
      !parsedFields.description ||
      parsedFields.description
        .split(/[.!?](\s|$)/)
        .filter((s) => s.trim().length > 0).length < 2
    ) {
      console.error(
        '[generate-ai-bet POST] Serverseitige Validierung der AI-Antwort fehlgeschlagen.',
        rawAIMessage,
        parsedFields
      );
      return NextResponse.json(
        { error: 'Format der AI-Antwort konnte nicht validiert werden.' },
        { status: 502 }
      );
    }

    // Wichtig: Das Frontend (AddEventDialog) erwartet `event_bet_on.date` als ISO-String für die Deadline-Berechnung.
    // Wenn es ein CardPayload war, hatte `eventToBetOn.date` den Wert `new Date(0).toISOString()`.
    // Wir können das so belassen oder für die Response ein aktuelles Datum setzen,
    // damit `getDefaultDeadlineString` im Frontend damit umgehen kann.
    // Ein `new Date(0)` wird von `getDefaultDeadlineString` bereits so behandelt, dass eine Deadline in der Zukunft gesetzt wird.
    const eventDataForResponse = {
      ...eventToBetOn,
      // Stelle sicher, dass das Datum ein gültiger ISO-String ist.
      // Wenn es new Date(0) war, kann es so bleiben, oder du setzt es auf new Date().toISOString()
      // date: eventToBetOn.date === new Date(0).toISOString() ? new Date().toISOString() : eventToBetOn.date,
    };

    return NextResponse.json({
      message: `Titel: ${parsedFields.title}\nBeschreibung: ${parsedFields.description || ''}\nOptionen:\n${parsedFields.options.join('\n')}`,
      wildcard_prompt: parsedFields.wildcard_prompt || '',
      event_bet_on: eventDataForResponse,
    });
  } catch (error: any) {
    let errorMessage = 'Interner Serverfehler bei der AI-Wettgenerierung.';
    if (error.message) errorMessage = error.message;
    if (error instanceof Groq.APIError) {
      console.error(
        '[generate-ai-bet POST] Groq API Fehler:',
        error.status,
        error.name,
        error.message,
        error.error
      );
      errorMessage = `Groq API Fehler: ${error.message}`;
    } else {
      console.error('[generate-ai-bet POST] Fehler im API-Handler:', error);
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
