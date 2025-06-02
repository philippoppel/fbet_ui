import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import {
  addDays,
  fetchAndParseOpenLigaCompetition,
  fetchAndParseAustriaMatchesOpenLiga,
} from '@/app/api/services/football_schedule';
import { FootballEvent } from '@/app/lib/types'; // Passen Sie den Pfad ggf. an

/* -------------------------------------------------------------------------- */
/* Konfiguration                                                              */
/* -------------------------------------------------------------------------- */
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

const OPEN_LIGA_COMPETITIONS: Record<
  string,
  { shortcut: string; season: string }
> = {
  nla_24_25: { shortcut: 'nla', season: '2024' },
  cl_24_25: { shortcut: 'ucl2024', season: '2024' },
  kwm_25: { shortcut: 'kwm', season: '2025' },
};
const AUSTRIA_TEAM_ID_OPENLIGA = '148';

/* -------------------------------------------------------------------------- */
/* Hilfsfunktion zum Formatieren der Spieldaten für die AI                    */
/* -------------------------------------------------------------------------- */
function formatMatchesForAI(events: FootballEvent[]): string {
  if (!events || events.length === 0) {
    return 'Keine Spiele für diesen Zeitraum gefunden.';
  }
  return events
    .map(
      (e) =>
        `- Wettbewerb: ${e.competition}, Datum: ${e.matchDate}, Heim: ${e.homeTeam}, Auswärts: ${e.awayTeam}${e.result ? `, Ergebnis: ${e.result}` : ''}, Status: ${e.status}`
    )
    .join('\n');
}

/* -------------------------------------------------------------------------- */
/* GET‑Handler für AI Top Matches                                             */
/* -------------------------------------------------------------------------- */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const daysParam = Number(searchParams.get('days') ?? '30');
    const days =
      Number.isFinite(daysParam) && daysParam > 0 && daysParam <= 90
        ? daysParam
        : 30;
    const numberOfTopMatches = 5;

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
    const allEvents = nestedResults.flat();

    const uniqueEventsMap = new Map<string, FootballEvent>();
    for (const event of allEvents) {
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
    const relevantEvents = Array.from(uniqueEventsMap.values()).sort(
      (a, b) =>
        new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
    );

    if (relevantEvents.length === 0) {
      return NextResponse.json({
        message:
          'Keine Spiele im angegebenen Zeitraum gefunden, um Top-Spiele zu bestimmen.',
        top_matches: [],
      });
    }

    const matchesStringForAI = formatMatchesForAI(relevantEvents);

    const systemPrompt = `Du bist ein Fußballexperte, der die spannendsten, wichtigsten oder interessantesten bevorstehenden Fußballspiele aus einer gegebenen Liste identifiziert.
Deine Antwort muss **ausschließlich** ein valides JSON-**Objekt** sein. Dieses Objekt muss einen Schlüssel namens \`selected_matches\` enthalten, dessen Wert ein Array der von dir ausgewählten Spiele ist.
Jedes Objekt im Array \`selected_matches\` muss die Felder "wettbewerb", "datum" (im ISO 8601 UTC Format YYYY-MM-DDTHH:MM:SS.sssZ), "heimteam", "auswaertsteam" und einen kurzen "grund" (warum es ein Top-Spiel ist, max. 15 Wörter) enthalten.
Gib KEINEN einleitenden Text, keine Erklärungen und kein umschließendes Markdown zurück, NUR das JSON-Objekt.
Wenn du keine Spiele als "Top-Spiel" einstufen kannst oder die Liste leer ist, gib ein JSON-Objekt mit einem leeren Array für \`selected_matches\` zurück, also: \`{"selected_matches": []}\`.`;

    const userPrompt = `Hier ist eine Liste von Fußballspielen für die nächsten ${days} Tage (Datum ist UTC, aktuelles Datum für Referenz ist ${new Date().toISOString()}):
${matchesStringForAI}

Bitte wähle daraus die ${numberOfTopMatches} spannendsten oder wichtigsten Spiele aus.
Gib deine Antwort als einzelnes JSON-Objekt zurück. Dieses Objekt muss einen Schlüssel namens \`selected_matches\` haben. Der Wert dieses Schlüssels muss ein Array von Objekten sein.
Jedes Objekt im Array \`selected_matches\` muss dieses Format haben:
{ "wettbewerb": "...", "datum": "...", "heimteam": "...", "auswaertsteam": "...", "grund": "..." }
Achte darauf, dass das "datum" im korrekten ISO 8601 UTC Format ist (z.B. "2025-06-04T18:45:00.000Z").
Beziehe dich ausschließlich auf die bereitgestellten Spieldaten. Nimm keine Spiele hinzu, die nicht in der Liste stehen.`;

    const response = await groq.chat.completions.create({
      model: 'llama3-70b-8192',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      response_format: { type: 'json_object' },
    });

    const messageContent = response.choices?.[0]?.message?.content;
    // console.log('[ai-top-matches] Rohantwort von Groq:', messageContent);

    if (!messageContent) {
      console.error('[ai-top-matches] Leere Antwort von Groq.');
      return NextResponse.json(
        { error: 'Keine Antwort von der AI erhalten.' },
        { status: 502 }
      );
    }

    try {
      const parsedResponse = JSON.parse(messageContent);
      let aiSelectedMatches;

      if (parsedResponse && Array.isArray(parsedResponse.selected_matches)) {
        aiSelectedMatches = parsedResponse.selected_matches;
      } else {
        console.error(
          '[ai-top-matches] AI-Antwort ist kein JSON-Objekt mit dem erwarteten Schlüssel "selected_matches", der ein Array ist. Antwort:',
          parsedResponse
        );
        throw new Error(
          'AI-Antwort hat nicht das erwartete Format (Objekt mit selected_matches Array).'
        );
      }

      // Optionale Validierung des Inhalts des Arrays
      if (
        !aiSelectedMatches.every(
          (item: any) =>
            typeof item.datum === 'string' &&
            typeof item.heimteam === 'string' &&
            typeof item.wettbewerb === 'string'
        )
      ) {
        console.error(
          '[ai-top-matches] Das von der AI gelieferte Array "selected_matches" hat nicht die erwartete Struktur in seinen Elementen.',
          aiSelectedMatches
        );
        // Nicht unbedingt ein Fehler werfen, aber loggen. Die wichtigsten Felder sollten da sein.
      }

      return NextResponse.json({ top_matches: aiSelectedMatches });
    } catch (parseError: any) {
      console.error(
        '[ai-top-matches] Fehler beim Parsen der AI-Antwort:',
        parseError.message,
        'Rohantwort:',
        messageContent
      );
      return NextResponse.json(
        {
          error:
            'Fehler beim Parsen der AI-Antwort. Die AI hat möglicherweise kein valides JSON im erwarteten Format geliefert.',
          ai_raw_response: messageContent,
        },
        { status: 502 }
      );
    }
  } catch (error: any) {
    // Spezifischen Fehler von Groq loggen, falls vorhanden
    if (error instanceof Groq.APIError) {
      console.error(
        '[ai-top-matches] Groq API Fehler:',
        error.status,
        error.name,
        error.message,
        error.error
      );
    } else {
      console.error(
        '[ai-top-matches] Allgemeiner Fehler im API-Handler:',
        error
      );
    }
    return NextResponse.json(
      {
        error: `Interner Serverfehler: ${error.message || 'Unbekannter Fehler'}`,
      },
      { status: 500 }
    );
  }
}
