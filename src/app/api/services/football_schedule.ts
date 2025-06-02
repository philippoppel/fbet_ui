// src/app/api/services/football_schedule.ts
import axios from 'axios';
// NEU: Importiere den zentralen FootballEvent-Typ
import type { FootballEvent } from '@/app/lib/types'; // Passen Sie den Pfad ggf. an

/* -------------------------------------------------------------------------- */
/* Typen und Konstanten                                                       */
/* -------------------------------------------------------------------------- */
const OPENLIGA_DB_BASE_URL = 'https://api.openligadb.de';
const USER_AGENT = 'FriendlyBetPlatform/1.1';
const REQUEST_TIMEOUT_MS = 20_000;

// Die lokale FootballEvent-Definition hier wird ENTFERNT, wir verwenden die aus lib/types.ts
// export interface FootballEvent {
//   competition: string;
//   matchDate: string;
//   homeTeam: string;
//   awayTeam: string;
//   result: string | null;
//   status: string;
// }

/* -------------------------------------------------------------------------- */
/* Hilfsfunktionen                                                            */
/* -------------------------------------------------------------------------- */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function calculateWeeksBetween(dateFrom: Date, dateTo: Date): number {
  const diffTime = Math.abs(dateTo.getTime() - dateFrom.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.ceil(diffDays / 7) + 1;
}

/* -------------------------------------------------------------------------- */
/* FETCH: OpenLigaDB Logik                                                    */
/* -------------------------------------------------------------------------- */

async function mapOpenLigaMatchToFootballEvent(
  m: any, // Rohes Match-Objekt von OpenLigaDB
  defaultCompetitionName: string
): Promise<FootballEvent> {
  // Verwendet jetzt den importierten Typ
  const isFinished = m.matchIsFinished ?? m.MatchIsFinished ?? false;
  const results = m.matchResults ?? m.MatchResults;
  let resultString: string | null = null;

  if (isFinished && Array.isArray(results)) {
    const finalResultObject = results.find(
      (r: any) =>
        (r.resultName ?? r.ResultName) === 'Endergebnis' ||
        (r.resultName ?? r.ResultName) === 'Endstand'
    );
    if (finalResultObject) {
      resultString = `${finalResultObject.pointsTeam1 ?? finalResultObject.PointsTeam1 ?? 0} : ${finalResultObject.pointsTeam2 ?? finalResultObject.PointsTeam2 ?? 0}`;
    } else if (results.length > 0) {
      const lastResult = results[results.length - 1];
      resultString = `${lastResult.pointsTeam1 ?? lastResult.PointsTeam1 ?? 0} : ${lastResult.pointsTeam2 ?? lastResult.PointsTeam2 ?? 0}`;
    }
  }

  const matchDateTimeRaw =
    m.matchDateTimeUTC ?? m.matchDateTime ?? m.MatchDateTime;
  const matchDateISO = matchDateTimeRaw
    ? new Date(matchDateTimeRaw).toISOString()
    : new Date(0).toISOString();

  let status = 'SCHEDULED';
  if (isFinished) {
    status = 'FINISHED';
  } else if (
    new Date(matchDateISO) < new Date() &&
    matchDateISO !== new Date(0).toISOString()
  ) {
    status = 'SCHEDULED_PAST';
  }

  // NEU: matchID hinzufügen
  const matchID = m.matchID ?? m.MatchID ?? 0; // Fallback auf 0, falls nicht vorhanden (sollte aber)

  return {
    matchID: matchID, // Wichtig für den Typ aus lib/types.ts
    competition:
      m.leagueName ?? m.LeagueName ?? defaultCompetitionName.toUpperCase(),
    matchDate: matchDateISO,
    homeTeam: m.team1?.teamName ?? m.Team1?.TeamName ?? 'N/A',
    awayTeam: m.team2?.teamName ?? m.Team2?.TeamName ?? 'N/A',
    result: resultString,
    status: status,
    leagueShortcut: m.leagueShortcut ?? m.LeagueShortcut,
    leagueSeason: m.leagueSeason ?? m.LeagueSeason,
  };
}

export async function fetchAndParseOpenLigaCompetition(
  leagueShortcut: string,
  leagueSeason: string,
  dateFrom: Date, // dateFrom und dateTo werden für die Filterung nach dem Abruf verwendet
  dateTo: Date
): Promise<FootballEvent[]> {
  const url = `${OPENLIGA_DB_BASE_URL}/getmatchdata/${leagueShortcut}/${leagueSeason}`;

  try {
    const { data } = await axios.get<any[]>(url, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: { 'User-Agent': USER_AGENT },
    });
    const fixtures = Array.isArray(data) ? data : [];

    const processedFixturesPromises = fixtures.map(
      (m) => mapOpenLigaMatchToFootballEvent(m, leagueShortcut) // leagueShortcut als default competition name
    );
    const processedFixtures = await Promise.all(processedFixturesPromises);

    return processedFixtures.filter((event) => {
      if (event.matchDate === new Date(0).toISOString()) return false; // Ungültige Daten herausfiltern
      const eventDate = new Date(event.matchDate);
      return eventDate >= dateFrom && eventDate <= dateTo;
    });
  } catch (error: any) {
    console.error(
      `❌ Error fetching OpenLigaDB ${leagueShortcut} (${leagueSeason}):`,
      error.message
    );
    return [];
  }
}

export async function fetchAndParseAustriaMatchesOpenLiga(
  // KEIN token als erstes Argument
  teamId: string,
  dateFrom: Date, // dateFrom und dateTo für die Filterung
  dateTo: Date
): Promise<FootballEvent[]> {
  // calculateWeeksBetween wird hier nicht mehr benötigt, da wir nachher nach Datum filtern
  // Stattdessen holen wir einfach einen großzügigen Zeitraum, z.B. alle Spiele des Teams
  // oder man müsste die Wochen basierend auf dateFrom/dateTo hier neu berechnen, wenn der Endpunkt das erfordert.
  // Der Endpunkt /getmatchesbyteamid/{teamId} holt alle Spiele.
  // Der Endpunkt /getmatchesbyteamid/{teamId}/{pastWeeks}/{futureWeeks} ist spezifischer.
  // Wir verwenden hier den Endpunkt, der alle Spiele des Teams liefert und filtern dann.
  // Alternativ: const weeksToCover = calculateWeeksBetween(dateFrom, dateTo);
  // const url = `${OPENLIGA_DB_BASE_URL}/getmatchesbyteamid/${teamId}/0/${weeksToCover}`;
  const url = `${OPENLIGA_DB_BASE_URL}/getmatchdata/${teamId}`; // Holt alle Spiele eines Teams über dessen ID (OpenLigaDB spezifisch, wenn TeamID als Liga fungiert)
  // ODER, falls es der /getmatchesbyteamId/{teamId} Endpunkt ist:
  // const url = `${OPENLIGA_DB_BASE_URL}/getmatchesbyteamid/${teamId}`; <- Dieser Endpunkt existiert so nicht laut Ihrer Doku.
  // Es gibt /getmatchesbyteamid/{teamId}/{weekCountPast}/{weekCountFuture}

  // Korrekter Endpunkt, um Spiele eines Teams zu bekommen und dann zu filtern:
  // Man müsste eigentlich ALLE Ligen durchgehen, in denen Österreich spielt,
  // oder einen Endpunkt nutzen, der team-spezifisch über alle Ligen sucht.
  // Die sauberste Lösung wäre, die relevanten Ligen (WM-Quali, etc.) explizit abzufragen und
  // DANN nach Österreich zu filtern.
  // Da wir aber fetchAndParseAustriaMatchesOpenLiga haben, gehe ich davon aus,
  // dass diese Funktion eine Methode kennt, Österreichs Spiele zu bekommen.
  // Wenn sie den /getmatchesbyteamid/{teamId}/{weekCountPast}/{weekCountFuture} Endpunkt verwendet:

  const weeksToCover = calculateWeeksBetween(new Date(), dateTo); // Wochen von jetzt bis dateTo
  const austriaSpecificUrl = `${OPENLIGA_DB_BASE_URL}/getmatchesbyteamid/${teamId}/0/${weeksToCover}`;

  try {
    const { data } = await axios.get<any[]>(austriaSpecificUrl, {
      // austriaSpecificUrl verwenden
      timeout: REQUEST_TIMEOUT_MS,
      headers: { 'User-Agent': USER_AGENT },
    });
    const fixtures = Array.isArray(data) ? data : [];

    const processedFixturesPromises = fixtures.map(
      (m) => mapOpenLigaMatchToFootballEvent(m, m.leagueName || 'AUT') // Wettbewerbsname aus dem Spiel nehmen oder "AUT"
    );
    const processedFixtures = await Promise.all(processedFixturesPromises);

    return processedFixtures.filter((event) => {
      if (event.matchDate === new Date(0).toISOString()) return false;
      if (
        (event.homeTeam === 'N/A' || !event.homeTeam) &&
        (event.awayTeam === 'N/A' || !event.awayTeam)
      ) {
        return false;
      }
      const eventDate = new Date(event.matchDate);
      return eventDate >= dateFrom && eventDate <= dateTo;
    });
  } catch (error: any) {
    console.error(
      `❌ Error fetching OpenLigaDB Austria Matches (ID: ${teamId}):`,
      error.message
    );
    return [];
  }
}
