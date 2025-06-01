import axios from 'axios';

/* -------------------------------------------------------------------------- */
/* Typen und Konstanten                                                       */
/* -------------------------------------------------------------------------- */
const OPENLIGA_DB_BASE_URL = 'https://api.openligadb.de';
const USER_AGENT = 'FriendlyBetPlatform/1.1'; // Ihr User-Agent
const REQUEST_TIMEOUT_MS = 20_000;

export interface FootballEvent {
  competition: string; // z.B. "NLA", "CL", "AUT" (für Österreich-Spiele)
  matchDate: string; // ISO-8601 UTC
  homeTeam: string;
  awayTeam: string;
  result: string | null; // "2 : 1" oder null
  status: string; // FINISHED | SCHEDULED | SCHEDULED_PAST (wenn Datum vorbei, aber nicht als Finished markiert)
}

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
  return Math.ceil(diffDays / 7) + 1; // +1 Woche als Puffer
}

/* -------------------------------------------------------------------------- */
/* FETCH: OpenLigaDB Logik                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Mappt ein einzelnes OpenLigaDB Match-Objekt zu unserem FootballEvent-Format.
 */
async function mapOpenLigaMatchToFootballEvent(
  m: any,
  competitionIdentifier: string
): Promise<FootballEvent> {
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
      // Fallback: nehme das letzte Ergebnis in der Liste, wenn kein "Endergebnis" explizit markiert ist
      const lastResult = results[results.length - 1];
      resultString = `${lastResult.pointsTeam1 ?? lastResult.PointsTeam1 ?? 0} : ${lastResult.pointsTeam2 ?? lastResult.PointsTeam2 ?? 0}`;
    }
  }

  // OpenLigaDB liefert matchDateTime oft als lokale Zeit der Liga oder UTC.
  // matchDateTimeUTC ist bevorzugt, falls vorhanden.
  // new Date() parst ISO 8601 Strings (mit Z oder Offset) korrekt in UTC-basierte Zeitstempel.
  const matchDateTimeRaw =
    m.matchDateTimeUTC ?? m.matchDateTime ?? m.MatchDateTime;
  // Fallback auf ein sehr altes Datum, wenn keines vorhanden, um Fehler zu vermeiden
  const matchDateISO = matchDateTimeRaw
    ? new Date(matchDateTimeRaw).toISOString()
    : new Date(0).toISOString();

  let status = 'SCHEDULED';
  if (isFinished) {
    status = 'FINISHED';
  } else if (new Date(matchDateISO) < new Date()) {
    // Wenn das Spieldatum in der Vergangenheit liegt, aber nicht als 'finished' markiert ist
    status = 'SCHEDULED_PAST';
  }

  return {
    competition: competitionIdentifier.toUpperCase(),
    matchDate: matchDateISO,
    homeTeam: m.team1?.teamName ?? m.Team1?.TeamName ?? 'N/A',
    awayTeam: m.team2?.teamName ?? m.Team2?.TeamName ?? 'N/A',
    result: resultString,
    status: status,
  };
}

/**
 * Ruft Spiele für einen bestimmten Wettbewerb (leagueShortcut und season) von OpenLigaDB ab
 * und filtert sie nach dem Datumsbereich.
 */
export async function fetchAndParseOpenLigaCompetition(
  leagueShortcut: string,
  leagueSeason: string,
  dateFrom: Date,
  dateTo: Date
): Promise<FootballEvent[]> {
  const url = `${OPENLIGA_DB_BASE_URL}/getmatchdata/${leagueShortcut}/${leagueSeason}`;

  try {
    const { data } = await axios.get<any[]>(url, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: { 'User-Agent': USER_AGENT },
    });
    const fixtures = Array.isArray(data) ? data : [];

    const processedFixtures = await Promise.all(
      fixtures.map((m) => mapOpenLigaMatchToFootballEvent(m, leagueShortcut))
    );

    return processedFixtures.filter((event) => {
      const eventDate = new Date(event.matchDate);
      return eventDate >= dateFrom && eventDate <= dateTo;
    });
  } catch (error: any) {
    console.error(
      `❌ Error fetching OpenLigaDB ${leagueShortcut} (${leagueSeason}):`,
      error.message
    );
    return []; // Leeres Array bei Fehler
  }
}

/**
 * Ruft alle Spiele der österreichischen Nationalmannschaft von OpenLigaDB ab
 * und filtert sie nach dem Datumsbereich.
 */
export async function fetchAndParseAustriaMatchesOpenLiga(
  teamId: string,
  dateFrom: Date,
  dateTo: Date
): Promise<FootballEvent[]> {
  const weeksToCover = calculateWeeksBetween(dateFrom, dateTo);
  const url = `${OPENLIGA_DB_BASE_URL}/getmatchesbyteamid/${teamId}/0/${weeksToCover}`;

  try {
    const { data } = await axios.get<any[]>(url, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: { 'User-Agent': USER_AGENT },
    });
    const fixtures = Array.isArray(data) ? data : [];

    const processedFixtures = await Promise.all(
      fixtures.map((m) => mapOpenLigaMatchToFootballEvent(m, 'AUT')) // Spezielle Kennung für Österreich-Spiele
    );

    return processedFixtures.filter((event) => {
      // Herausfiltern von Spielen ohne gültige Teamnamen (oft Platzhalter)
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
    return []; // Leeres Array bei Fehler
  }
}
