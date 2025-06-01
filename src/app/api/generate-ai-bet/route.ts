// src/app/api/generate-ai-bet/route.ts

import { Groq } from 'groq-sdk';
import { NextRequest, NextResponse } from 'next/server';
import {
  addDays,
  fetchAndParseOpenLigaCompetition,
  fetchAndParseAustriaMatchesOpenLiga,
  type FootballEvent,
} from '@/app/api/services/football_schedule';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

interface GenericEvent {
  type: 'football' | 'boxing' | 'ufc' | 'unknown';
  competition?: string;
  date: string;
  eventName?: string;
  homeTeam?: string;
  awayTeam?: string;
  status?: string;
  [key: string]: any;
}

const OPEN_LIGA_COMPETITIONS: Record<
  string,
  { shortcut: string; season: string }
> = {
  nla_24_25: { shortcut: 'nla', season: '2024' },
  cl_24_25: { shortcut: 'ucl2024', season: '2024' },
  kwm_25: { shortcut: 'kwm', season: '2025' },
};
const AUSTRIA_TEAM_ID_OPENLIGA = '148';

function formatEventForAIContext(event: GenericEvent): string {
  let context = `Typ: ${event.type}\nDatum: ${new Date(event.date).toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vienna' })} (Wiener Zeit)`;
  if (event.competition) context += `\nWettbewerb: ${event.competition}`;
  if (event.homeTeam && event.awayTeam)
    context += `\nTeams: ${event.homeTeam} gegen ${event.awayTeam}`;
  else if (event.eventName) context += `\nEvent-Name: ${event.eventName}`;
  if (event.status) context += `\nStatus: ${event.status}`;
  return context;
}

interface ParsedAIBet {
  title: string;
  question: string;
  description: string;
  options: string[];
}

function extractAIFieldsFromServer(text: string): Partial<ParsedAIBet> {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  let title = '';
  let question = '';
  let description = '';
  let options: string[] = [];
  let parsingState: 'none' | 'options' | 'description' = 'none';

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (lowerLine.startsWith('titel:')) {
      title = line.substring('titel:'.length).trim().replace(/^"|"$/g, '');
      parsingState = 'none';
    } else if (lowerLine.startsWith('frage:')) {
      question = line.substring('frage:'.length).trim().replace(/^"|"$/g, '');
      parsingState = 'none';
    } else if (lowerLine.startsWith('beschreibung:')) {
      description = line.substring('beschreibung:'.length).trim();
      parsingState = 'description';
    } else if (lowerLine.startsWith('optionen:')) {
      parsingState = 'options';
    } else if (parsingState === 'options') {
      if (
        line.length > 0 &&
        !['titel:', 'frage:', 'beschreibung:', 'optionen:'].some((kw) =>
          lowerLine.startsWith(kw)
        )
      ) {
        options.push(line.replace(/^(\*|\-|\d+\.|[A-Z]\))\s*/, '').trim());
      } else if (
        ['titel:', 'frage:', 'beschreibung:'].some((kw) =>
          lowerLine.startsWith(kw)
        )
      ) {
        parsingState = 'none';
      }
    } else if (parsingState === 'description') {
      if (
        !['titel:', 'frage:', 'optionen:'].some((kw) =>
          lowerLine.startsWith(kw)
        )
      ) {
        description += '\n' + line;
      } else {
        parsingState = 'none';
      }
    }
  }
  description = description.trim();
  return {
    title: title,
    question: question || title,
    description: description,
    options: options,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
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

    const promises: Promise<FootballEvent[]>[] = [];
    for (const key in OPEN_LIGA_COMPETITIONS) {
      const comp = OPEN_LIGA_COMPETITIONS[key];
      promises.push(
        fetchAndParseOpenLigaCompetition(
          comp.shortcut,
          comp.season,
          dateFrom,
          dateTo
        )
      );
    }
    promises.push(
      fetchAndParseAustriaMatchesOpenLiga(
        AUSTRIA_TEAM_ID_OPENLIGA,
        dateFrom,
        dateTo
      )
    );

    const nestedResults = await Promise.all(promises);
    let allFootballEvents = nestedResults.flat();

    const uniqueEventsMap = new Map<string, FootballEvent>();
    for (const event of allFootballEvents) {
      const homeTeamNorm = (event.homeTeam ?? 'N/A')
        .toLowerCase()
        .replace(/fc |afc |1\. /gi, '')
        .trim();
      const awayTeamNorm = (event.awayTeam ?? 'N/A')
        .toLowerCase()
        .replace(/fc |afc |1\. /gi, '')
        .trim();
      const dateOnly = event.matchDate.substring(0, 10);
      const teamKey = [homeTeamNorm, awayTeamNorm].sort().join(':');
      const uniqueKey = `${dateOnly}:${teamKey}`;
      if (!uniqueEventsMap.has(uniqueKey)) {
        uniqueEventsMap.set(uniqueKey, event);
      }
    }
    const relevantFootballEvents = Array.from(uniqueEventsMap.values()).sort(
      (a, b) =>
        new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
    );

    if (relevantFootballEvents.length === 0) {
      return NextResponse.json(
        {
          message:
            'Keine passenden Fußball-Events gefunden, für die eine Wette generiert werden könnte.',
        },
        { status: 404 }
      );
    }

    // --- Änderung: Zufälliges Event auswählen ---
    const randomIndex = Math.floor(
      Math.random() * relevantFootballEvents.length
    );
    const selectedFootballEvent = relevantFootballEvents[randomIndex];
    // --- Ende Änderung ---

    const eventToBetOn: GenericEvent = {
      ...selectedFootballEvent,
      type: 'football',
      date: selectedFootballEvent.matchDate,
    };

    const eventContextString = formatEventForAIContext(eventToBetOn);
    console.log(
      `[generate-ai-bet GET] Event-Kontext für AI (zufällig ausgewählt: ${eventToBetOn.homeTeam} vs ${eventToBetOn.awayTeam}):`,
      eventContextString
    );

    const systemContent = `Du bist ein extrem kreativer und humorvoller Assistent, der sich auf Deutsch sehr ungewöhnliche, lustige und spezifische Wettideen für Freundesgruppen ausdenkt, die sich auf ein konkretes Sportereignis beziehen.
Deine Wetten gehen immer über einfache Sieg- oder Ergebniswetten hinaus. Sie beziehen sich auf kuriose Details, spezifische Vorkommnisse oder Nebenaspekte des Events.
Halte dich **strikt** an das vorgegebene Ausgabeformat:
Titel: [Wettfrage]
Beschreibung: [Details]
Optionen:
[Option 1]
[Option 2]
[usw.]
Gib **nur** diesen Text zurück, ohne zusätzliche Einleitungen, Erklärungen oder Markdown, außer für die Feldnamen selbst.`;

    const homeTeamForPrompt = eventToBetOn.homeTeam || 'Heimteam';
    const awayTeamForPrompt = eventToBetOn.awayTeam || 'Auswärtsteam';
    const dateForPrompt = new Date(eventToBetOn.date).toLocaleDateString(
      'de-DE'
    );

    // --- Änderung: User-Prompt präzisiert für Optionen ---
    const userContent = `Generiere eine kreative, lustige und **ausgefallene** Wettidee auf Deutsch für eine Freundesgruppe. Die Wette muss sich **spezifisch und eindeutig** auf das folgende Sportereignis beziehen:
Sportereignis-Details:
${eventContextString}

Die Wette soll sich **nicht** nur darum drehen, wer gewinnt. Konzentriere dich auf Nebenaspekte, spezifische Aktionen, Statistiken oder kuriose Vorkommnisse, die während des Events passieren könnten.

Gib die Antwort **nur** in diesem exakten Format zurück, ohne zusätzliche Erklärungen, Einleitungen oder Markdown (außer für die Feldnamen selbst):

Titel: [Formuliere hier eine spezifische und ausgefallene Wettfrage für das oben genannte Event. Die Frage sollte klare, unterscheidbare Antwortmöglichkeiten erlauben. Beispiel: "Wie viele Eckbälle gibt es insgesamt im Spiel ${homeTeamForPrompt} gegen ${awayTeamForPrompt} am ${dateForPrompt}?"]
Beschreibung: [Erkläre hier kurz die Regeln oder Details der Wette, bezogen auf das Event und die im Titel gestellte Frage. Stelle sicher, dass die Beschreibung das Event klar benennt, falls nicht schon im Titel geschehen.]
Optionen:
[Option A - eine klare Antwortmöglichkeit auf die Frage im Titel]
[Option B - eine andere klare Antwortmöglichkeit]
[Option C - ggf. eine weitere klare Antwortmöglichkeit]

WICHTIG:
1. Die Frage im 'Titel' und die 'Beschreibung' müssen sich **klar und eindeutig** auf das gegebene Sportereignis beziehen und das Event identifizierbar machen (z.B. durch Nennung der Teams ${homeTeamForPrompt} und ${awayTeamForPrompt}).
2. Der 'Titel' soll eine **ausgefallene Wettfrage** sein.
3. Die 'Optionen' müssen die Frage im 'Titel' **direkt, eindeutig und als voneinander abgrenzbare Auswahlmöglichkeiten** beantworten. Es müssen mindestens zwei Optionen sein.
4. **Beispiele für gute Titel/Optionen-Paare:**
   - Titel: "In welchem 15-Minuten-Intervall fällt das erste Tor im Spiel ${homeTeamForPrompt} vs ${awayTeamForPrompt}?"
     Optionen:
     [1-15 Minuten]
     [16-30 Minuten]
     [31-45+ Minuten (1. HZ)]
     [Kein Tor in 1. HZ]
   - Titel: "Wie viele gelbe Karten bekommt Team ${homeTeamForPrompt} im gesamten Spiel?"
     Optionen:
     [0-1 Karten]
     [2 Karten]
     [3+ Karten]
   - Titel: "Gibt es einen Elfmeter im Spiel ${homeTeamForPrompt} vs ${awayTeamForPrompt}?"
     Optionen:
     [Ja]
     [Nein]
   **Vermeide unspezifische Optionen oder Optionen, die selbst Bedingungen sind (z.B. "Mehr als X Tore" ist schlecht, wenn der Titel "Wie viele Tore?" fragt. Besser: "0-1 Tore", "2-3 Tore", "4+ Tore").**
5. Vermeide generische Fragen. Je spezifischer für das Event "${homeTeamForPrompt} vs ${awayTeamForPrompt}", desto besser!`;
    // --- Ende Prompt-Änderung ---

    const response = await groq.chat.completions.create({
      model: 'llama3-70b-8192',
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: userContent },
      ],
      temperature: 0.85,
    });

    const rawAIMessage = response.choices?.[0]?.message?.content;
    console.log(
      '[generate-ai-bet GET] Rohe Antwort von Groq erhalten:',
      rawAIMessage
    );

    const parsedFields = extractAIFieldsFromServer(rawAIMessage || '');

    if (
      !parsedFields.title ||
      !parsedFields.options ||
      parsedFields.options.length < 2
    ) {
      console.error(
        '[generate-ai-bet GET] Serverseitige Validierung/Extraktion der AI-Antwort fehlgeschlagen.',
        rawAIMessage,
        parsedFields
      );
      return NextResponse.json(
        {
          error:
            'Format der AI-Antwort konnte serverseitig nicht validiert werden oder es fehlen Titel/Optionen.',
        },
        { status: 502 }
      );
    }

    const reconstructedMessage = `Titel: ${parsedFields.title}
Beschreibung: ${parsedFields.description || ''}
Optionen:
${parsedFields.options.join('\n')}`;

    return NextResponse.json({
      message: reconstructedMessage,
      event_bet_on: eventToBetOn,
    });
  } catch (error: any) {
    let errorMessage = 'Interner Serverfehler.';
    if (error.message) errorMessage = error.message;
    if (error instanceof Groq.APIError) {
      console.error(
        '[generate-ai-bet GET] Groq API Fehler:',
        error.status,
        error.name,
        error.message,
        error.error
      );
      errorMessage = `Groq API Fehler: ${error.message}`;
    } else {
      console.error('[generate-ai-bet GET] Fehler im API-Handler:', error);
    }
    return NextResponse.json(
      { error: `Fehler bei der Wettgenerierung: ${errorMessage}.` },
      { status: 500 }
    );
  }
}
