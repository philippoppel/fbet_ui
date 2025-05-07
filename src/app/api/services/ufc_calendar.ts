import axios from 'axios';
import { parseICS, VEvent } from 'node-ical';

export type UfcEvent = {
  summary: string | null;
  location: string | null;
  description: string | null;
  uid: string | null;
  dtstart: string;
  dtend: string | null;
};

const UFC_ICS_URL =
  'https://raw.githubusercontent.com/clarencechaan/ufc-cal/ics/UFC.ics';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
};

function isVEvent(entry: any): entry is VEvent {
  return entry?.type === 'VEVENT' && entry.start instanceof Date;
}

export async function fetchAndParseUfcSchedule(): Promise<UfcEvent[]> {
  try {
    const response = await axios.get(UFC_ICS_URL, {
      headers: HEADERS,
      timeout: 20000,
      responseType: 'text',
    });

    const parsed = parseICS(response.data);
    const today = new Date();
    const events: UfcEvent[] = [];

    Object.values(parsed).forEach((entry) => {
      if (!isVEvent(entry)) return;
      if (entry.start < today) return;

      events.push({
        summary: entry.summary ?? null,
        location: entry.location ?? null,
        description: entry.description ?? null,
        uid: entry.uid ?? null,
        dtstart: entry.start.toISOString(),
        dtend: entry.end ? entry.end.toISOString() : null,
      });
    });

    return events.sort((a, b) => a.dtstart.localeCompare(b.dtstart));
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error('❌ HTTP-Fehler:', error.message);
    } else {
      console.error('❌ ICS-Parsing-Fehler:', error);
    }
    throw new Error('UFC-Kalender konnte nicht geladen oder geparst werden.');
  }
}
