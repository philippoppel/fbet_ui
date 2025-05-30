// src/app/layout.tsx
'use client';

import type { Metadata } from 'next';
import { Inter, Fira_Code } from 'next/font/google';
import './globals.css';

import { ReactNode, useCallback, useEffect, useState } from 'react';
import { AuthProvider } from '@/app/context/AuthContext';
import { ThemeProvider } from '@/app/components/ThemeProvider';
import { Toaster } from '@/app/components/ui/sonner';
import { SiteLayout } from '@/app/components/layout/SiteLayout';
import { Smartphone, Download, RefreshCw } from 'lucide-react'; // RefreshCw Icon hinzugefügt
import { Button } from '@/app/components/ui/button';
import { toast } from 'sonner';

// NEU: Capacitor-Imports
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar';
import { useAppRefresh } from '@/app/hooks/useAppRefresh';

// Hook für App-Refresh importieren

/* ------------------ FONTS ------------------ */
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

/* ------------------ Helper ------------------ */
const isiOS = () =>
  typeof navigator !== 'undefined' &&
  /iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid = () =>
  typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

/* ------------------ ROOT LAYOUT ------------------ */
export default function RootLayout({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  // useAppRefresh Hook verwenden
  const {
    refresh: refreshApp,
    updateAvailable: appUpdateAvailable,
    online: isOnline,
  } = useAppRefresh();

  /* ... (Deine bestehende Logik für PWA-Installation: showManualHint, handleInstallClick, useEffects für beforeinstallprompt, appinstalled, requestPWAInstall, successfulLoginForPwaPrompt bleiben unverändert) ... */
  /* Manual instructions */
  const showManualHint = () => {
    const txt = isiOS()
      ? 'Am Besten einloogen & dann Teilen‑/Actions‑Button → "Zum Home‑Bildschirm"'
      : isAndroid()
        ? 'Chrome-Menü → "Zum Home‑Bildschirm"'
        : 'Installationsoption im Browser-Menü';
    toast.info('Manuelle Installation', { description: txt, duration: 8000 });
  };

  /* Install click */
  const handleInstallClick = useCallback(() => {
    if (deferredPrompt) {
      (deferredPrompt as any).prompt();
      (deferredPrompt as any).userChoice.then((choice: any) => {
        if (choice.outcome === 'accepted') {
          // Das 'appinstalled' Event kümmert sich um das Toast und localStorage.
        } else {
          localStorage.setItem('fbetPwaInstallState', 'dismissed_prompt');
          toast.info('Installation abgebrochen', {
            description:
              'Du kannst die App später über das Browsermenü oder den Link auf der Startseite installieren.',
          });
        }
        setDeferredPrompt(null);
        setCanInstall(false);
      });
    } else {
      showManualHint();
    }
  }, [deferredPrompt]);

  /* Capture beforeinstallprompt */
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  /* Listen to successful install */
  useEffect(() => {
    const onInstalled = () => {
      toast.success('Fbet wurde installiert ✅');
      localStorage.setItem('fbetPwaInstallState', 'installed');
      setCanInstall(false);
    };
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

  /* ⇢ Listen for global manual dispatch (Landing‑Page link) */
  useEffect(() => {
    const handler = () => handleInstallClick();
    window.addEventListener('requestPWAInstall', handler);
    return () => window.removeEventListener('requestPWAInstall', handler);
  }, [handleInstallClick]);

  /* NEUER useEffect für den Post-Login Installations-Toast */
  useEffect(() => {
    const showInstallPromptToast = () => {
      const pwaInstallState = localStorage.getItem('fbetPwaInstallState');
      const isInBrowser =
        typeof window !== 'undefined' &&
        !window.matchMedia('(display-mode: standalone)').matches;

      if (
        isInBrowser &&
        canInstall &&
        pwaInstallState !== 'installed' &&
        pwaInstallState !== 'dismissed_prompt' &&
        pwaInstallState !== 'dismissed_toast_permanently'
      ) {
        const toastId = 'pwa-install-toast-after-login';
        toast.custom(
          (t) => (
            <div className='bg-background text-foreground p-4 rounded-lg shadow-xl flex flex-col sm:flex-row items-center justify-between border border-border w-full max-w-md dark:bg-slate-800 dark:border-slate-700'>
              <div className='flex items-center mb-3 sm:mb-0 sm:mr-4'>
                <Smartphone className='w-7 h-7 mr-3 text-primary flex-shrink-0' />
                <div>
                  <h4 className='font-semibold'>App installieren?</h4>
                  <p className='text-sm text-muted-foreground'>
                    Füge Fbet für schnellen Zugriff deinem Startbildschirm
                    hinzu.
                  </p>
                </div>
              </div>
              <div className='flex flex-row sm:flex-col space-x-2 sm:space-x-0 sm:space-y-2 w-full sm:w-auto'>
                <Button
                  variant='default'
                  size='sm'
                  className='flex-1 sm:flex-initial'
                  onClick={() => {
                    handleInstallClick();
                    toast.dismiss(t);
                  }}
                >
                  Installieren <Download className='ml-2 w-4 h-4' />
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  className='flex-1 sm:flex-initial'
                  onClick={() => {
                    localStorage.setItem(
                      'fbetPwaInstallState',
                      'dismissed_toast_permanently'
                    );
                    toast.dismiss(t);
                  }}
                >
                  Nicht jetzt
                </Button>
              </div>
            </div>
          ),
          {
            id: toastId,
            duration: 15000,
          }
        );
      }
    };

    window.addEventListener(
      'successfulLoginForPwaPrompt',
      showInstallPromptToast
    );
    return () => {
      window.removeEventListener(
        'successfulLoginForPwaPrompt',
        showInstallPromptToast
      );
    };
  }, [canInstall, handleInstallClick, deferredPrompt]);

  /* ------------------ SW REGISTRATION ------------------ */
  // Deine bestehende SW-Registrierungslogik ist gut, besonders das `reg.update()`.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const regSw = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none', // WICHTIG: sonst cached Browser sw.js aggressiv!
        });
        console.log('[Layout] Service Worker registriert. Trigger update()...');
        await reg.update();
      } catch (err) {
        console.error('[Layout] SW Registrierung fehlgeschlagen', err);
      }
    };

    // Initial bei Load registrieren
    window.addEventListener('load', regSw);
    return () => window.removeEventListener('load', regSw);
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const interval = setInterval(
      async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          console.log('[Layout] Intervall → Prüfe SW update()...');
          await reg.update();
        }
      },
      1000 * 60 * 5
    ); // alle 5 Minuten

    return () => clearInterval(interval);
  }, []);

  // NEU: useEffect, um einen Toast anzuzeigen, wenn appUpdateAvailable true wird
  useEffect(() => {
    if (appUpdateAvailable) {
      const toastId = 'app-update-toast'; // Eindeutige ID für den Toast
      toast('Update verfügbar', {
        id: toastId,
        description:
          'Eine neue Version von Fbet ist bereit. Jetzt aktualisieren?',
        duration: Infinity, // Toast bleibt sichtbar, bis der Benutzer interagiert
        action: {
          label: 'Aktualisieren',
          onClick: () => {
            console.log(
              '[Layout] Update-Button geklickt. Rufe refreshApp() auf...'
            );
            refreshApp(); // Ruft die refresh-Funktion aus dem useAppRefresh Hook auf
            // toast.dismiss(toastId); // Optional: Toast sofort entfernen oder warten bis Seite neu lädt
          },
        },
        icon: <RefreshCw className='w-5 h-5 text-primary' />, // Icon für den Toast
        // closeButton: true, // Optional: Schließen-Button anzeigen
      });
    }
  }, [appUpdateAvailable, refreshApp]);

  /* ... (Dein useEffect für Capacitor Statusleiste bleibt unverändert) ... */
  useEffect(() => {
    const configureStatusBar = async () => {
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
        try {
          await StatusBar.setOverlaysWebView({ overlay: false });
          console.log(
            'Capacitor: StatusBar.setOverlaysWebView auf false gesetzt.' // Korrigierter Log-Text
          );
        } catch (e) {
          console.error(
            'Capacitor: Fehler beim Konfigurieren der Statusleiste',
            e
          );
        }
      }
    };

    configureStatusBar();
  }, []);

  return (
    <html
      lang='de'
      className={`${inter.variable} ${firaCode.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* ... (deine Head-Elemente bleiben unverändert) ... */}
        <meta charSet='utf-8' />
        <meta httpEquiv='X-UA-Compatible' content='IE=edge' />
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover'
        />
        <meta name='apple-mobile-web-app-capable' content='yes' />
        <meta name='apple-mobile-web-app-status-bar-style' content='default' />
        <meta name='apple-mobile-web-app-title' content='Fbet' />
        <meta
          name='theme-color'
          media='(prefers-color-scheme: light)'
          content='#ffffff'
        />
        <meta
          name='theme-color'
          media='(prefers-color-scheme: dark)'
          content='#000000'
        />
        <link rel='manifest' href='/manifest.json' />
        <link rel='icon' href='/favicon.ico' />
        <link
          rel='apple-touch-icon'
          sizes='180x180'
          href='/apple-touch-icon.png'
        />
      </head>
      <body className='font-sans antialiased'>
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <div
              className='flex flex-col min-h-dvh overflow-x-hidden bg-gradient-to-b
                            from-background to-slate-50 dark:from-slate-900 dark:to-slate-800
                            pb-[env(safe-area-inset-bottom)]
                            px-[env(safe-area-inset-left)]' // px korrigiert für safe-area-inset-right
            >
              {/* Optional: Online-/Offline-Status anzeigen */}
              {!isOnline && (
                <div
                  style={{
                    position: 'fixed', // Oder 'sticky' wenn es im Scrollfluss bleiben soll
                    top: 0,
                    left: 0,
                    width: '100%',
                    backgroundColor: 'hsl(var(--destructive))', // Verwende deine Theme-Farben
                    color: 'hsl(var(--destructive-foreground))',
                    padding: '8px',
                    textAlign: 'center',
                    zIndex: 1000, // Über anderen Elementen
                    fontSize: '0.875rem',
                  }}
                >
                  Du bist offline. Einige Funktionen sind möglicherweise nicht
                  verfügbar.
                </div>
              )}
              <SiteLayout>{children}</SiteLayout>
            </div>
            <Toaster richColors position='top-center' />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
