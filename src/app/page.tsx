// src/app/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUfcSchedule, getBoxingSchedule, ApiError } from '@/lib/api';
import type { UfcEventItem, BoxingScheduleItem, MixedEvent } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { BarChartBig, LogIn, UserPlus } from 'lucide-react';
import { EventListPublic } from '@/components/dashboard/EventListPublic'; // Icons für Header/Buttons

export default function LandingPage() {
  const router = useRouter();
  const [ufcEvents, setUfcEvents] = useState<UfcEventItem[]>([]);
  const [boxingEvents, setBoxingEvents] = useState<BoxingScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Daten laden ---
  useEffect(() => {
    // ... (Datenlade-Logik wie im vorherigen Vorschlag) ...
    const loadPublicEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const [ufc, boxing] = await Promise.all([
          getUfcSchedule(),
          getBoxingSchedule(),
        ]);
        setUfcEvents(ufc);
        setBoxingEvents(boxing);
      } catch (err: any) {
        console.error('Fehler beim Laden der öffentlichen Events:', err);
        setError('Fehler beim Laden der Event-Daten.');
        if (err instanceof ApiError) {
          setError(`Fehler (${err.status}): ${err.detail || err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };
    loadPublicEvents();
  }, []);

  // --- Hilfsfunktionen & Memoization (parseDate, combinedEvents) ---
  // ... (Code wie im vorherigen Vorschlag) ...
  const parseDate = (dateStr: string): Date => {
    const now = new Date();
    const hasYear = /\d{4}/.test(dateStr);
    const fixedDate = hasYear ? dateStr : `${dateStr} ${now.getFullYear()}`;
    const parsed = new Date(fixedDate);
    return isNaN(parsed.getTime()) ? new Date(0) : parsed;
  };

  const combinedEvents: MixedEvent[] = useMemo(() => {
    return [
      ...ufcEvents.map((e, i) => ({
        /* ... Mapping ... */ id: e.uid || `ufc-${i}`,
        title: e.summary || 'Unbekannter UFC Kampf',
        subtitle:
          (e.dtstart
            ? new Date(e.dtstart).toLocaleString('de-DE', {
                dateStyle: 'short',
                timeStyle: 'short',
              })
            : 'Datum unbekannt') +
          ' – ' +
          (e.location || 'Ort unbekannt'),
        sport: 'ufc' as const,
        date: e.dtstart ? parseDate(e.dtstart) : new Date(0),
        original: e,
      })),
      ...boxingEvents.map((e, i) => {
        /* ... Mapping ... */
        const parsedDate = parseDate(e.date || '');
        return {
          id: e.details || `boxing-${i}`,
          title: e.details || 'Unbekannter Boxkampf',
          subtitle:
            parsedDate.toLocaleDateString('de-DE', { dateStyle: 'short' }) +
            ' – ' +
            (e.location || 'Ort unbekannt') +
            (e.broadcaster ? ` (${e.broadcaster})` : ''),
          sport: 'boxing' as const,
          date: parsedDate,
          original: e,
        };
      }),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [ufcEvents, boxingEvents]);

  // --- Handler für Gäste-Klick auf "Wette hinzufügen" ---
  const handleProposeEventGuest = (
    event: UfcEventItem | BoxingScheduleItem // Der Typ ist eine Union
  ) => {
    // Sicher den passenden Titel ermitteln
    let eventTitle = 'dieses Event'; // Fallback-Titel

    // Type Guard: Prüfen, ob 'details' im Objekt existiert UND ein sinnvoller String ist
    if (
      'details' in event &&
      typeof event.details === 'string' &&
      event.details.trim()
    ) {
      // Wenn ja, wissen wir hier: event ist (wahrscheinlich) ein BoxingScheduleItem
      eventTitle = event.details;
    }
    // Type Guard: Ansonsten prüfen, ob 'summary' existiert UND ein sinnvoller String ist
    else if (
      'summary' in event &&
      typeof event.summary === 'string' &&
      event.summary.trim()
    ) {
      // Wenn ja, wissen wir hier: event ist (wahrscheinlich) ein UfcEventItem (oder Boxing ohne Details)
      eventTitle = event.summary;
    }
    // Optional: Hier könntest du noch weitere Fallbacks einbauen

    // Jetzt den sicher ermittelten eventTitle verwenden
    toast.info('Login erforderlich', {
      description: `Melde dich an, um "${eventTitle}" für eine Wette vorzuschlagen.`, // Verwende die Variable
      action: {
        label: 'Login / Register',
        onClick: () => router.push('/login'), // Leitet zur Login-Seite weiter
      },
      duration: 5000,
    });
  };

  return (
    <div className='flex flex-col min-h-screen bg-background'>
      {/* Hauptinhalt */}
      <main className='flex-1 container mx-auto px-4 md:px-8 py-6'>
        {/* Hero Sektion */}
        <section className='text-center py-12 md:py-20'>
          <h1 className='text-4xl font-bold tracking-tight mb-4 text-foreground sm:text-5xl md:text-6xl'>
            Einfach mit Freunden wetten.
          </h1>
          <p className='max-w-2xl mx-auto mb-8 text-lg text-muted-foreground'>
            Verfolge UFC & Box-Events und starte deine eigene Tipprunde.{' '}
            <br className='hidden sm:block' />
            Ganz ohne externe Anbieter – nur Spaß mit deinen Freunden.
          </p>
          {/* ... (Buttons wie vorher) ... */}
          <div className='flex justify-center gap-4'>
            <Link href='/register' passHref>
              <Button size='lg'>Jetzt Tipprunde starten</Button>
            </Link>
            <Link href='/login' passHref>
              <Button size='lg' variant='outline'>
                Einloggen
              </Button>
            </Link>
          </div>
        </section>
        {/* "Wie es funktioniert"-Sektion */}
        <section className='text-center py-16'>
          <h2 className='text-3xl font-bold tracking-tight mb-4'>
            So einfach geht&#39;s:
          </h2>
          <div className='grid md:grid-cols-3 gap-8 max-w-4xl mx-auto text-muted-foreground'>
            <div>
              <h3 className='font-semibold text-lg text-foreground mb-2'>
                1. Events sehen
              </h3>
              <p>Sieh dir kommende UFC- und Box-Kämpfe direkt hier an.</p>
            </div>
            <div>
              <h3 className='font-semibold text-lg text-foreground mb-2'>
                2. Freunde einladen
              </h3>
              <p>
                Erstelle (oder trete bei) eine private Gruppe nur für deine
                Freunde. <span className='text-xs'>(Login nötig)</span>
              </p>
            </div>
            <div>
              <h3 className='font-semibold text-lg text-foreground mb-2'>
                3. Spaß haben
              </h3>
              <p>
                Schlagt Kämpfe vor, tippt gemeinsam und seht, wer der Experte
                ist. <span className='text-xs'>(Login nötig)</span>
              </p>
            </div>
          </div>
        </section>

        {/* Event Liste */}
        <section className='mt-12'>
          <h2 className='text-2xl font-semibold tracking-tight mb-6 text-center sm:text-left'>
            Anstehende Kämpfe
          </h2>
          {/* ... (Loading/Error/Empty States wie vorher) ... */}
          {loading && (
            <p className='text-center text-muted-foreground animate-pulse'>
              Lade Events...
            </p>
          )}
          {error && <p className='text-center text-destructive'>{error}</p>}
          {!loading && !error && combinedEvents.length === 0 && (
            <p className='text-center text-muted-foreground'>
              Keine Events gefunden.
            </p>
          )}
          {!loading && !error && combinedEvents.length > 0 && (
            <EventListPublic
              events={combinedEvents.slice(0, 5)}
              onProposeEvent={handleProposeEventGuest} // Der neue Handler wird übergeben
            />
          )}
        </section>
      </main>
      {/* Stelle sicher, dass Toaster hier global geladen wird, z.B. in layout.tsx */}
      {/* <Toaster richColors theme="dark" /> */}
    </div>
  );
}
