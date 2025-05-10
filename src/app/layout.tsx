// src/app/layout.tsx
'use client';

import type { Metadata } from 'next';
import { Inter, Fira_Code } from 'next/font/google';
import './globals.css';

import { useEffect, useState, ReactNode, useCallback } from 'react'; // useCallback hinzugefügt
import { AuthProvider } from '@/app/context/AuthContext';
import { ThemeProvider } from '@/app/components/ThemeProvider';
import { Toaster } from '@/app/components/ui/sonner';
import { SiteLayout } from '@/app/components/layout/SiteLayout';

import { Button } from '@/app/components/ui/button';
import { Smartphone, Download, RefreshCw, Info } from 'lucide-react'; // RefreshCw, Info hinzugefügt
import { toast } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const firaCode = Fira_Code({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const isIOS = () =>
  typeof navigator !== 'undefined' &&
  /iphone|ipad|ipod/i.test(navigator.userAgent);

const PWAPromptMobile: React.FC<{ onInstall: () => void }> = ({
  onInstall,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () =>
      typeof window !== 'undefined' && window.innerWidth < 768;
    setIsMobile(checkMobile());

    if (
      checkMobile() &&
      typeof window !== 'undefined' &&
      !window.matchMedia('(display-mode: standalone)').matches &&
      'serviceWorker' in navigator // Nur zeigen, wenn PWAs unterstützt werden
    ) {
      // Zeige Prompt nur, wenn 'beforeinstallprompt' verfügbar war (also App installierbar ist)
      // Dies wird nun eher durch den globalen Toast oder den Button gesteuert
      // Diese Komponente kann vereinfacht oder durch eine spezifischere Benachrichtigung ersetzt werden
      // wenn 'deferredInstallPrompt' verfügbar ist.
      const isInstallable = !!sessionStorage.getItem(
        'pwaInstallPromptAvailable'
      ); // Indikator setzen
      if (isInstallable) {
        const timer = setTimeout(() => setIsVisible(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  if (!isVisible || !isMobile) return null;

  return (
    <div className='md:hidden fixed bottom-4 left-4 right-4 z-50'>
      <div className='bg-secondary text-secondary-foreground p-4 rounded-lg shadow-xl flex items-center justify-between'>
        <div className='flex items-center'>
          <Smartphone className='w-6 h-6 mr-3' />
          <div>
            <h4 className='font-semibold'>App installieren?</h4>
            <p className='text-sm'>
              Für schnellen Zugriff zum Startbildschirm hinzufügen.
            </p>
          </div>
        </div>
        <Button variant='ghost' size='sm' onClick={onInstall}>
          Installieren
          <Download className='ml-2 w-4 h-4' />
        </Button>
      </div>
    </div>
  );
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [newWorker, setNewWorker] = useState<ServiceWorker | null>(null);
  const [showUpdateToast, setShowUpdateToast] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(display-mode: standalone)').matches &&
      isIOS()
    ) {
      setIsStandalone(true);
    }
  }, []);

  const showInstallPrompt = useCallback(() => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          toast.success('App installiert!', {
            description: 'Du findest uns jetzt auf deinem Startbildschirm.',
          });
        } else {
          toast.info('Installation abgebrochen.', {
            description:
              'Du kannst die App später über das Browser-Menü hinzufügen.',
          });
        }
        setDeferredInstallPrompt(null);
        sessionStorage.removeItem('pwaInstallPromptAvailable');
      });
    } else {
      toast.info('Installations-Prompt nicht verfügbar.', {
        description:
          'Die App ist möglicherweise bereits installiert, dein Browser unterstützt die Installation nicht oder die Installationskriterien sind nicht erfüllt. Suche im Browser-Menü nach "Zum Startbildschirm hinzufügen".',
      });
    }
  }, [deferredInstallPrompt]);

  const activateNewWorker = useCallback(() => {
    if (newWorker) {
      newWorker.postMessage({ type: 'SKIP_WAITING' });
      // Der Service Worker sollte `clients.claim()` verwenden und die Seite
      // wird durch den 'controllerchange'-Event Handler neu geladen.
      setShowUpdateToast(false); // Toast ausblenden
    }
  }, [newWorker]);

  // Effekt für Service Worker Registrierung und Update-Handling
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker nicht unterstützt.');
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        console.log('[Layout] Service Worker registriert:', registration.scope);

        // Auf Updates prüfen, wenn eine neue Version der Seite geladen wird
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            setNewWorker(installingWorker); // Den neuen Worker speichern
            console.log(
              '[Layout] Neuer Service Worker gefunden, warte auf Installation...'
            );
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed') {
                console.log('[Layout] Neuer Service Worker installiert.');
                if (navigator.serviceWorker.controller) {
                  // Ein aktiver SW kontrolliert die Seite, Update ist verfügbar
                  setShowUpdateToast(true); // Zustand für den Toast setzen
                } else {
                  // Erster SW, Inhalt ist für Offline-Nutzung gecached
                  console.log('[Layout] Inhalte für Offline-Nutzung gecached.');
                }
              }
            });
          }
        });
        // Initial nach Updates suchen (wichtig nach Hard-Reloads oder Cache-Löschungen)
        registration.update();
      } catch (error) {
        console.error(
          '[Layout] Service Worker Registrierung fehlgeschlagen:',
          error
        );
      }
    };

    // Registriere SW nach dem Laden der Seite
    window.addEventListener('load', registerServiceWorker);

    // Seite neu laden, wenn ein neuer SW die Kontrolle übernimmt
    const handleControllerChange = () => {
      console.log(
        '[Layout] Service Worker Controller hat gewechselt. Lade Seite neu...'
      );
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange
    );

    return () => {
      window.removeEventListener('load', registerServiceWorker);
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange
      );
      // Die 'updatefound'-Listener auf der registration müssen nicht explizit entfernt werden,
      // solange die 'registration' Instanz nicht global gehalten wird und GC werden kann.
    };
  }, []); // Läuft einmal beim Mounten

  // Effekt für PWA Installations-Prompt
  useEffect(() => {
    const beforeInstallPromptHandler = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e as any); // 'any' hier, da BeforeInstallPromptEvent nicht immer global typisiert ist
      sessionStorage.setItem('pwaInstallPromptAvailable', 'true'); // Für PWAPromptMobile
      console.log(
        "'beforeinstallprompt' Event ausgelöst. App ist installierbar."
      );

      if (!sessionStorage.getItem('pwaInstallToastShown')) {
        toast('📲 App installieren?', {
          description:
            'Für das beste Erlebnis, füge uns zu deinem Startbildschirm hinzu!',
          duration: 10000,
          action: {
            label: 'Installieren',
            onClick: showInstallPrompt, // useCallback-Version wird verwendet
          },
          onDismiss: () =>
            sessionStorage.setItem('pwaInstallToastShown', 'true'),
          onAutoClose: () =>
            sessionStorage.setItem('pwaInstallToastShown', 'true'),
        });
      }
    };

    // Dein Custom Event Listener (optional, wenn du ihn anderweitig triggerst)
    const handleRequestInstallEvent = () => {
      showInstallPrompt();
    };

    window.addEventListener('beforeinstallprompt', beforeInstallPromptHandler);
    window.addEventListener('requestPWAInstall', handleRequestInstallEvent);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        beforeInstallPromptHandler
      );
      window.removeEventListener(
        'requestPWAInstall',
        handleRequestInstallEvent
      );
      sessionStorage.removeItem('pwaInstallPromptAvailable');
    };
  }, [showInstallPrompt]); // showInstallPrompt ist mit useCallback memoisiert

  // Zeige Update-Toast, wenn `showUpdateToast` true ist
  useEffect(() => {
    if (showUpdateToast) {
      toast.info('Eine neue Version der App ist verfügbar!', {
        duration: Infinity, // Bleibt, bis Benutzer interagiert
        action: {
          label: 'Aktualisieren & Neu laden',
          onClick: activateNewWorker,
        },
        onDismiss: () => setShowUpdateToast(false), // Erlaube das Schließen des Toasts
      });
    }
  }, [showUpdateToast, activateNewWorker]);

  return (
    <html
      lang='de'
      className={`${inter.variable} ${firaCode.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta charSet='utf-8' />
        <meta httpEquiv='X-UA-Compatible' content='IE=edge' />
        <meta
          name='viewport'
          content='width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no'
        />
        {/* Meta Tags aus dem ursprünglichen RootLayout, ggf. um PWA-spezifische ergänzt */}
        <meta name='apple-mobile-web-app-capable' content='yes' />
        <meta name='apple-mobile-web-app-status-bar-style' content='default' />
        <meta name='apple-mobile-web-app-title' content='Fbet' />
        <meta name='application-name' content='Fbet' />
        <meta name='format-detection' content='telephone=no' />
        <meta name='mobile-web-app-capable' content='yes' />
        <meta name='msapplication-TileColor' content='#000000' />
        <meta name='msapplication-tap-highlight' content='no' />
        <meta
          name='theme-color'
          content='#ffffff'
          media='(prefers-color-scheme: light)'
        />
        <meta
          name='theme-color'
          content='#000000' // Schwarzer Theme-Color für Dark Mode
          media='(prefers-color-scheme: dark)'
        />
        <link rel='manifest' href='/manifest.json' />
        <link
          rel='icon'
          type='image/png'
          sizes='32x32'
          href='/favicon-32x32.png'
        />
        <link
          rel='icon'
          type='image/png'
          sizes='16x16'
          href='/favicon-16x16.png'
        />
        <link rel='icon' href='/favicon.ico' />
        {/* <link rel='icon' type='image/svg+xml' href='/favicon.svg' /> // Wenn du ein SVG Favicon hast */}
        <link
          rel='apple-touch-icon'
          sizes='180x180'
          href='/apple-touch-icon.png'
        />
        {/* Add more apple-touch-icons for different resolutions if needed */}
      </head>
      <body className={`font-sans antialiased`}>
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <div className='flex flex-col min-h-dvh bg-gradient-to-b from-background to-slate-50 dark:from-slate-900 dark:to-slate-800'>
              {isStandalone && (
                <div
                  className='bg-blue-100 dark:bg-blue-900 border-l-4 border-blue-500 text-blue-700 dark:text-blue-300 p-3 text-sm'
                  role='alert'
                >
                  <div className='flex items-center'>
                    <Info className='w-5 h-5 mr-2' />
                    <p>
                      Die App läuft im Vollbildmodus. "Pull-to-Refresh"
                      (Herunterziehen zum Aktualisieren) ist möglicherweise
                      deaktiviert. Nutze interne Refresh-Buttons, um Inhalte zu
                      aktualisieren.
                    </p>
                  </div>
                </div>
              )}
              <SiteLayout>{children}</SiteLayout>
            </div>
            <PWAPromptMobile onInstall={showInstallPrompt} />
            <Toaster richColors position='top-center' />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
