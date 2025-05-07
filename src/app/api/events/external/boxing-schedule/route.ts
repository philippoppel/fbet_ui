// src/app/api/events/external/boxing-schedule/route.ts
import { NextResponse } from 'next/server';
import {
  fetchAndParseBoxingSchedule,
  type BoxingEvent,
} from '@/app/api/services/espn_scraper'; // Annahme: BoxingEvent wird exportiert

// Cache-Speicher und Konfiguration (im Modul-Scope)
let cachedBoxingData: BoxingEvent[] | null = null;
let boxingCacheTimestamp: number | null = null;
const BOXING_CACHE_DURATION_MS = 1 * 60 * 60 * 1000; // 1 Stunde in Millisekunden

export async function GET() {
  const now = Date.now();

  // Prüfen, ob gültige Daten im Cache vorhanden sind
  if (
    cachedBoxingData &&
    boxingCacheTimestamp &&
    now - boxingCacheTimestamp < BOXING_CACHE_DURATION_MS
  ) {
    console.log('🥊 Boxing Schedule: Serving from cache');
    return NextResponse.json(cachedBoxingData);
  }

  console.log(
    '🥊 Boxing Schedule: Cache miss or expired, fetching fresh data...'
  );
  try {
    const data = await fetchAndParseBoxingSchedule();

    // Daten und Zeitstempel im Cache speichern
    cachedBoxingData = data;
    boxingCacheTimestamp = now;
    console.log('🥊 Boxing Schedule: Fresh data fetched and cached.');

    // Setze Cache-Control Header für Client-seitiges/CDN-Caching
    const response = NextResponse.json(data);
    response.headers.set(
      'Cache-Control',
      `public, s-maxage=${60 * 30}, stale-while-revalidate=${60 * 60}`
    ); // CDN-Cache: 30min, SWR: 1h
    return response;
  } catch (e) {
    console.error('Error fetching boxing schedule:', e);
    // Optional: Bei Fehler alte (abgelaufene) Daten zurückgeben, falls vorhanden
    // if (cachedBoxingData) {
    //   console.warn('🥊 Boxing Schedule: Fetch failed, serving stale data from cache');
    //   return NextResponse.json(cachedBoxingData);
    // }
    return NextResponse.json(
      { error: 'Failed to fetch boxing schedule' },
      { status: 503 } // Service Unavailable könnte passender sein
    );
  }
}
