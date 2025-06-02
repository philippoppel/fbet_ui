import { NextRequest, NextResponse } from 'next/server';
import {
  addDays,
  fetchAndParseOpenLigaCompetition,
  fetchAndParseAustriaMatchesOpenLiga,
} from '@/app/api/services/football_schedule';
import { FootballEvent } from '@/app/lib/types'; // Passen Sie den Pfad ggf. an

/* -------------------------------------------------------------------------- */
/* Konfiguration                                                              */
/* -------------------------------------------------------------------------- */

// OpenLigaDB → { shortcut: string, season: string }
// Hier "spannende" Wettbewerbe definieren.
// Stand: 1. Juni 2025 (d.h. wir schauen in den Juni/Juli 2025)
const OPEN_LIGA_COMPETITIONS: Record<
  string,
  { shortcut: string; season: string }
> = {
  nla_24_25: { shortcut: 'nla', season: '2024' }, // Nations League A 2024/25 (Finals Juni 2025)
  cl_24_25: { shortcut: 'ucl2024', season: '2024' }, // Champions League 2024/25 (Finale Ende Mai/Anf. Juni 2025)
  kwm_25: { shortcut: 'kwm', season: '2025' }, // Klub WM Juni/Juli 2025 (alternativ 'Cmw' mit season '2025')

  // ----- Zukünftige Erweiterungen durch Sie (Beispiele, Shortcuts/Saisons prüfen!): -----
  // Um weitere Turniere wie WM-Quali (allgemein), EM-Quali, oder EM/WM-Endrunden hinzuzufügen,
  // müssen Sie zuerst den korrekten 'leagueShortcut' und 'leagueSeason'
  // aus OpenLigaDB (z.B. via /getavailableleagues) ermitteln und hier eintragen.

  // Beispielhaft (diese Shortcuts und Saisons sind HYPOTHETISCH und müssen geprüft werden!):
  // wm_quali_uefa_26: { shortcut: 'wmqeu26', season: '2025' }, // Für WM 2026 Qualifikationsspiele der UEFA
  // em_quali_uefa_28: { shortcut: 'emqeu28', season: '2027' }, // Für EM 2028 Qualifikationsspiele der UEFA
  // wm_finals_26: { shortcut: 'wm2026', season: '2026' },        // Für die WM 2026 Endrunde
  // em_finals_28: { shortcut: 'em2028', season: '2028' },        // Für die EM 2028 Endrunde
};

const AUSTRIA_TEAM_ID_OPENLIGA = '148'; // TeamId für Österreich Nationalmannschaft

/* -------------------------------------------------------------------------- */
/* GET‑Handler                                                                */
/* -------------------------------------------------------------------------- */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const daysParam = Number(searchParams.get('days') ?? '30');
  const days =
    Number.isFinite(daysParam) && daysParam > 0 && daysParam <= 90
      ? daysParam
      : 30;

  const dateFrom = new Date();
  dateFrom.setUTCHours(0, 0, 0, 0);

  const dateTo = addDays(new Date(dateFrom), days - 1);
  dateTo.setUTCHours(23, 59, 59, 999);

  const promises: Promise<FootballEvent[]>[] = [];

  // Spezifische OpenLigaDB Wettbewerbe
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

  // Alle Spiele von Österreich (Länderspiele, Qualifikationsspiele etc.)
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
    // Einfache Deduplizierung: Das erste gefundene Spiel für diese Paarung an diesem Tag gewinnt.
    // Bei Bedarf kann hier eine Priorisierung eingebaut werden (z.B. Wettbewerbs-Priorität).
  }

  let processedEvents = Array.from(uniqueEventsMap.values());

  processedEvents.sort(
    (a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
  );

  return NextResponse.json(processedEvents, {
    headers: {
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=7200',
    },
  });
}
