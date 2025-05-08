// src/app/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUfcSchedule, getBoxingSchedule, ApiError } from '@/app/lib/api';
import type {
  UfcEventItem,
  BoxingScheduleItem,
  MixedEvent,
} from '@/app/lib/types';
import { toast } from 'sonner';
import {
  LogIn,
  UserPlus,
  Eye,
  Users,
  PartyPopper,
  Smartphone, // Wird für Icon im Text verwendet
  // Download, // Nicht mehr direkt hier für PWAPromptMobile benötigt
  ArrowRight,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { EventListPublic } from '@/app/components/dashboard/EventListPublic';
import { Button } from '@/app/components/ui/button';

// PWAPromptMobile Komponente und zugehörige Logik wurden entfernt (jetzt im RootLayout)

export default function LandingPage() {
  const router = useRouter();
  const [ufcEvents, setUfcEvents] = useState<UfcEventItem[]>([]);
  const [boxingEvents, setBoxingEvents] = useState<BoxingScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // deferredInstallPrompt und der useEffect für 'beforeinstallprompt' wurden entfernt

  const triggerGlobalInstallPrompt = () => {
    // Löst ein globales Event aus, auf das RootLayout hört
    window.dispatchEvent(new Event('requestPWAInstall'));
  };

  useEffect(() => {
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
        let errorMessage = 'Fehler beim Laden der Event-Daten.';
        if (err instanceof ApiError) {
          errorMessage = `API Fehler (${err.status}): ${err.detail || err.message}`;
        } else if (err.message) {
          errorMessage = err.message;
        }
        setError(errorMessage);
        toast.error('Ladefehler', {
          description: errorMessage,
        });
      } finally {
        setLoading(false);
      }
    };
    loadPublicEvents();
  }, []);

  const parseDate = (dateStr: string): Date => {
    const now = new Date();
    const hasYear = /\b\d{4}\b/.test(dateStr);
    let fullDateStr = dateStr;
    if (!hasYear) {
      fullDateStr = `${dateStr} ${now.getFullYear()}`;
    }
    const parsed = new Date(fullDateStr);
    return isNaN(parsed.getTime()) ? new Date(0) : parsed;
  };

  const combinedEvents: MixedEvent[] = useMemo(() => {
    return [...ufcEvents, ...boxingEvents]
      .map((e, i) => {
        const isBoxing = 'details' in e;
        const dateInput = isBoxing ? e.date || '' : e.dtstart || '';
        const date = parseDate(dateInput);

        if (date.getTime() === new Date(0).getTime() && dateInput) {
          console.warn(`Ungültiges Datum geparst für Event: ${dateInput}`, e);
        }

        return {
          id: isBoxing ? e.details || `boxing-${i}` : e.uid || `ufc-${i}`,
          title: isBoxing
            ? e.details || 'Unbekannter Boxkampf'
            : e.summary || 'Unbekannter UFC Kampf',
          subtitle: `${date.getTime() === new Date(0).getTime() ? 'Datum unbekannt' : date.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })} – ${e.location || 'Ort unbekannt'}${isBoxing && e.broadcaster ? ` (${e.broadcaster})` : ''}`,
          sport: isBoxing ? ('boxing' as const) : ('ufc' as const),
          date,
          original: e,
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [ufcEvents, boxingEvents]);

  const handleProposeEventGuest = (
    event: UfcEventItem | BoxingScheduleItem
  ) => {
    const title =
      'details' in event && event.details?.trim()
        ? event.details
        : 'summary' in event && event.summary?.trim()
          ? event.summary
          : 'dieses Event';

    toast.info('Login erforderlich', {
      description: `Melde dich an oder registriere dich, um "${title}" für eine Wette vorzuschlagen.`,
      action: {
        label: 'Login / Registrieren',
        onClick: () => router.push('/login'),
      },
      duration: 6000,
    });
  };

  return (
    // Der äußere div mit Gradient wurde entfernt; RootLayout stellt ihn bereit.
    // Das `main`-Element ist der primäre Container für den Inhalt dieser Seite.
    <main className='flex-1 container mx-auto px-4 md:px-6 py-8 md:py-12'>
      {/* Hero Section */}
      <section className='text-center pt-12 pb-16 md:pt-20 md:pb-24'>
        <h1 className='text-5xl md:text-7xl font-extrabold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 animate-gradient-x'>
          Wetten unter Freunden – auf alles, was Spaß macht.
        </h1>
        <p className='max-w-xl md:max-w-3xl mx-auto mb-10 text-lg md:text-xl text-muted-foreground'>
          Ob Sport, Serien, absurde Alltagswetten oder der nächste Krypto-Kurs –
          starte deine Tipprunde, fordere deine Freunde heraus und fiebert
          gemeinsam mit.
          <br />
          <span className='font-semibold text-primary'>
            100% kostenlos, werbefrei, nur der pure Spaß am Tippen.
          </span>
        </p>
        <div className='flex flex-col sm:flex-row justify-center items-center gap-4'>
          <Button
            size='lg'
            onClick={() => router.push('/register')}
            className='shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:scale-105'
          >
            <UserPlus className='mr-2 h-5 w-5' /> Eigene Gruppe starten
          </Button>
          <Button
            size='lg'
            variant='outline'
            onClick={() => router.push('/login')}
            className='shadow-sm hover:shadow-md transition-shadow duration-300'
          >
            <LogIn className='mr-2 h-5 w-5' /> Einloggen & Mitwetten
          </Button>
        </div>
        <p className='mt-8 text-sm text-muted-foreground flex items-center justify-center gap-2'>
          <Smartphone className='w-5 h-5 text-primary' />
          Auch als App!{' '}
          <a
            href='#'
            onClick={(e) => {
              e.preventDefault();
              triggerGlobalInstallPrompt(); // Löst das globale Event aus
            }}
            className='text-primary hover:underline font-semibold'
          >
            Jetzt installieren
          </a>{' '}
          für schnellen Zugriff.
        </p>
      </section>

      {/* How it works Section */}
      <section className='py-16 md:py-24 bg-slate-100/70 dark:bg-slate-800/30 rounded-xl shadow-sm'>
        <h2 className='text-4xl font-bold mb-14 text-center text-primary/90'>
          So einfach geht der Wett-Spaß
        </h2>
        <div className='grid md:grid-cols-3 gap-10 max-w-5xl mx-auto px-4'>
          <div className='flex flex-col items-center text-center p-6 bg-background rounded-lg shadow-md hover:shadow-lg transition-shadow'>
            <div className='p-4 bg-primary/10 rounded-full mb-4'>
              <Eye className='w-10 h-10 text-primary' />
            </div>
            <h3 className='font-semibold text-xl text-foreground mb-2'>
              1. Events entdecken
            </h3>
            <p className='text-muted-foreground text-sm'>
              Wählt gemeinsam ein Ereignis aus Sport, Serien, Politik oder
              völligem Blödsinn. Hauptsache, es macht Laune!
            </p>
          </div>
          <div className='flex flex-col items-center text-center p-6 bg-background rounded-lg shadow-md hover:shadow-lg transition-shadow'>
            <div className='p-4 bg-primary/10 rounded-full mb-4'>
              <Users className='w-10 h-10 text-primary' />
            </div>
            <h3 className='font-semibold text-xl text-foreground mb-2'>
              2. Freunde einladen
            </h3>
            <p className='text-muted-foreground text-sm'>
              Erstellt private Gruppen, ladet eure Crew ein und stimmt ab, auf
              welche Details ihr wetten wollt.
            </p>
          </div>
          <div className='flex flex-col items-center text-center p-6 bg-background rounded-lg shadow-md hover:shadow-lg transition-shadow'>
            <div className='p-4 bg-primary/10 rounded-full mb-4'>
              <PartyPopper className='w-10 h-10 text-primary' />
            </div>
            <h3 className='font-semibold text-xl text-foreground mb-2'>
              3. Gemeinsam mitfiebern
            </h3>
            <p className='text-muted-foreground text-sm'>
              Gebt eure Tipps ab, fiebert mit, stichelt untereinander – und
              feiert am Ende den glorreichen Sieger (oder euch selbst!).
            </p>
          </div>
        </div>
      </section>

      {/* Public Events Section */}
      <section className='mt-16 md:mt-24'>
        <h2 className='text-3xl md:text-4xl font-semibold tracking-tight mb-8 text-center sm:text-left text-foreground/90'>
          🔥 Aktuelle Events
        </h2>
        {loading && (
          <div className='flex flex-col items-center justify-center min-h-[200px] text-muted-foreground'>
            <Loader2 className='w-12 h-12 animate-spin text-primary mb-4' />
            <p className='text-lg'>Lade die heißesten Events...</p>
          </div>
        )}
        {error && (
          <div className='flex flex-col items-center justify-center min-h-[200px] bg-destructive/10 text-destructive p-6 rounded-lg'>
            <AlertTriangle className='w-12 h-12 mb-4' />
            <h3 className='text-xl font-semibold mb-2'>
              Oops! Etwas ist schiefgelaufen.
            </h3>
            <p className='text-center'>{error}</p>
            <Button
              variant='outline'
              // Verwende router.refresh() oder spezifische Neuladefunktion statt window.location.reload() für bessere SPA-Experience
              onClick={() => router.refresh()}
              className='mt-6'
            >
              Seite neu laden
            </Button>
          </div>
        )}
        {!loading && !error && combinedEvents.length === 0 && (
          <div className='text-center text-muted-foreground py-10 min-h-[200px] flex flex-col justify-center items-center'>
            <PartyPopper className='w-16 h-16 text-slate-400 mb-4' />
            <p className='text-xl mb-2'>Aktuell keine öffentlichen Events.</p>
            <p>Warum startest du nicht eine eigene Wettrunde mit Freunden?</p>
            <Button
              onClick={() => router.push('/register')}
              className='mt-6'
              size='lg'
            >
              <UserPlus className='mr-2' />
              Gruppe erstellen
            </Button>
          </div>
        )}
        {!loading && !error && combinedEvents.length > 0 && (
          <>
            <EventListPublic
              events={combinedEvents.slice(0, 6)}
              onProposeEvent={handleProposeEventGuest}
            />
            {combinedEvents.length > 6 && (
              <div className='text-center mt-10'>
                <Button
                  variant='outline'
                  size='lg'
                  onClick={() =>
                    toast.info(
                      'Mehr Events verfügbar nach Login/Registrierung.'
                    )
                  }
                >
                  Zeige alle Events <ArrowRight className='ml-2 w-5 h-5' />
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Final CTA or Footer Teaser */}
      <section className='text-center py-16 md:py-24 mt-12 md:mt-20 border-t border-border'>
        <h2 className='text-3xl md:text-4xl font-bold mb-6 text-foreground'>
          Bereit für den ultimativen Wett-Spaß?
        </h2>
        <p className='max-w-xl mx-auto mb-8 text-lg text-muted-foreground'>
          Schluss mit langweiligen Standardwetten. Erstelle deine eigenen,
          verrückten Tipps und zeig deinen Freunden, wer der wahre Experte ist!
        </p>
        <Button
          size='lg'
          onClick={() => router.push('/register')}
          className='shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:scale-105 animate-pulse'
        >
          <PartyPopper className='mr-2 h-6 w-6' />
          Jetzt kostenlos Tippgruppe gründen!
        </Button>
      </section>
    </main>
  );
}
