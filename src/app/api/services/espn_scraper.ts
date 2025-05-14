import axios from 'axios';
import * as cheerio from 'cheerio';

export type BoxingEvent = {
  date: string;
  location: string | null;
  broadcaster: string | null;
  details: string;
  parsedDate?: string | null; // ISO-String für maschinelle Nutzung
};

const ESPN_BOXING_URL =
  'https://www.espn.com/boxing/story/_/id/12508267/boxing-schedule';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
};

// Unterstützt auch Abkürzungen wie "Sept."
const MONTHS: Record<string, number> = {
  January: 0,
  February: 1,
  March: 2,
  April: 3,
  May: 4,
  June: 5,
  July: 6,
  August: 7,
  September: 8,
  October: 9,
  November: 10,
  December: 11,
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Sept: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

/**
 * Wandelt ESPN-Datumsformat wie "Sept. 12" in einen ISO-String um
 */
function parseBoxingDate(
  raw: string,
  fallbackYear = new Date().getFullYear()
): string | null {
  const parts = raw.trim().replace('.', '').split(' ');
  if (parts.length !== 2) return null;

  const month = MONTHS[parts[0]];
  const day = parseInt(parts[1], 10);
  if (month === undefined || isNaN(day)) return null;

  const date = new Date(fallbackYear, month, day, 12, 0); // 12:00 Uhr lokale Zeit
  return isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Parsiert eine Textzeile zu einem BoxingEvent
 */
function parseEventText(raw: string): BoxingEvent | null {
  const separator = ' -- ';
  if (!raw.includes(separator)) return null;

  const [header, detailsRaw] = raw.split(separator, 2);
  const [datePart, locationPartRaw] = header.split(':', 2);

  const date = datePart?.trim() ?? '';
  const details = detailsRaw?.trim() ?? '';
  if (!date || !details) return null;

  let location: string | null = null;
  let broadcaster: string | null = null;

  if (locationPartRaw) {
    const match = locationPartRaw.trim().match(/^(.*)\(([^)]+)\)$/);
    if (match) {
      location = match[1].trim();
      broadcaster = match[2].trim();
    } else {
      location = locationPartRaw.trim();
    }
  }

  return {
    date,
    location,
    broadcaster,
    details,
    parsedDate: parseBoxingDate(date),
  };
}

/**
 * Sucht nach der relevanten <ul>-Liste nach einer passenden Heading-Überschrift
 */
function findKeyDatesList($: cheerio.CheerioAPI): cheerio.Cheerio<any> | null {
  const headings = $('h2, h3');

  for (let i = 0; i < headings.length; i++) {
    const heading = headings.eq(i);
    const text = heading.text().toLowerCase();
    if (text.includes('key dates')) {
      let next = heading.next();
      while (next.length && !next.is('ul')) {
        next = next.next();
      }
      if (next.is('ul')) return next;
    }
  }

  return null;
}

/**
 * Hauptfunktion zum Laden und Parsen des Schedules
 */
export async function fetchAndParseBoxingSchedule(): Promise<BoxingEvent[]> {
  try {
    const response = await axios.get(ESPN_BOXING_URL, {
      headers: HEADERS,
      timeout: 20000,
    });

    const $ = cheerio.load(response.data);
    const keyDatesList = findKeyDatesList($);

    if (!keyDatesList) {
      console.warn('⚠️ Keine passende <ul>-Liste für "Key Dates" gefunden.');
      return [];
    }

    const events: BoxingEvent[] = [];

    keyDatesList.find('li').each((_, li) => {
      const text = $(li).text().trim();
      const parsed = parseEventText(text);
      if (parsed) events.push(parsed);
    });

    return events;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error('❌ HTTP-Fehler:', error.message);
    } else {
      console.error('❌ Parsing-Fehler:', error);
    }
    throw new Error(
      'Boxing schedule konnte nicht geladen oder geparst werden.'
    );
  }
}
