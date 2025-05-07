// src/app/api/events/external/ufc-schedule/route.ts
import { NextResponse } from 'next/server';
import {
  fetchAndParseUfcSchedule,
  type UfcEvent,
} from '@/app/api/services/ufc_calendar'; // Annahme: UfcEvent wird exportiert

// Cache-Speicher und Konfiguration
let cachedUfcData: UfcEvent[] | null = null;
let ufcCacheTimestamp: number | null = null;
const UFC_CACHE_DURATION_MS = 1 * 60 * 60 * 1000; // 1 Stunde in Millisekunden

export async function GET() {
  const now = Date.now();

  if (
    cachedUfcData &&
    ufcCacheTimestamp &&
    now - ufcCacheTimestamp < UFC_CACHE_DURATION_MS
  ) {
    console.log('🥋 UFC Schedule: Serving from cache');
    return NextResponse.json(cachedUfcData);
  }

  console.log('🥋 UFC Schedule: Cache miss or expired, fetching fresh data...');
  try {
    const data = await fetchAndParseUfcSchedule();
    cachedUfcData = data;
    ufcCacheTimestamp = now;
    console.log('🥋 UFC Schedule: Fresh data fetched and cached.');

    const response = NextResponse.json(data);
    response.headers.set(
      'Cache-Control',
      `public, s-maxage=${60 * 30}, stale-while-revalidate=${60 * 60}`
    );
    return response;
  } catch (e) {
    console.error('Error fetching UFC schedule:', e);
    return NextResponse.json(
      { error: 'Failed to fetch UFC schedule' },
      { status: 503 }
    );
  }
}
