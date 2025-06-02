// src/app/layout.tsx
'use client';

// Metadaten sind bei 'use client' Root-Layouts weniger direkt hier zu setzen,
// aber für die Struktur und mögliche zukünftige serverseitige Aspekte kann es bleiben.
// import type { Metadata } from 'next';
import { Inter, Fira_Code } from 'next/font/google';
import './globals.css';

import { ReactNode, useCallback, useEffect, useState } from 'react';
import Head from 'next/head'; // Für client-seitige <head> Anpassungen
import { AuthProvider } from '@/app/context/AuthContext';
import { ThemeProvider } from '@/app/components/ThemeProvider'; // Dein Wrapper
import { Toaster } from '@/app/components/ui/sonner';
import { SiteLayout } from '@/app/components/layout/SiteLayout';
import { Smartphone, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { toast } from 'sonner';

import { Capacitor } from '@capacitor/core';
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar'; // Style importiert als StatusBarStyle
import { useAppRefresh } from '@/app/hooks/useAppRefresh';
import { useHasMounted } from '@/app/hooks/useHasMounted';

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

  const {
    refresh: refreshApp,
    updateAvailable: appUpdateAvailable,
    online: isOnline,
  } = useAppRefresh();

  const hasMounted = useHasMounted();

  // State, um zu erkennen, ob die Komponente clientseitig gemountet wurde (für ThemeProvider-Fix)
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  /* PWA Installation Logic */
  const showManualHint = () => {
    const txt = isiOS()
      ? 'Zum Home‑Bildschirm: Teilen‑Button → "Zum Home‑Bildschirm"'
      : isAndroid()
        ? 'Zum Home‑Bildschirm: Chrome-Menü → "Zum Startbildschirm hinzufügen"'
        : 'Installationsoption im Browser-Menü';
    toast.info('Manuelle Installation', { description: txt, duration: 8000 });
  };

  const handleInstallClick = useCallback(() => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choice: any) => {
        if (choice.outcome === 'accepted') {
          // 'appinstalled' Event kümmert sich um Toast/localStorage.
        } else {
          localStorage.setItem('fbetPwaInstallState', 'dismissed_prompt');
          toast.info('Installation abgebrochen');
        }
        setDeferredPrompt(null);
        setCanInstall(false);
      });
    } else {
      showManualHint();
    }
  }, [deferredPrompt]);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    const onInstalled = () => {
      toast.success('Fbet wurde installiert ✅');
      localStorage.setItem('fbetPwaInstallState', 'installed');
      setCanInstall(false);
    };
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

  useEffect(() => {
    const handler = () => handleInstallClick();
    window.addEventListener('requestPWAInstall', handler);
    return () => window.removeEventListener('requestPWAInstall', handler);
  }, [handleInstallClick]);

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
    return () =>
      window.removeEventListener(
        'successfulLoginForPwaPrompt',
        showInstallPromptToast
      );
  }, [canInstall, handleInstallClick, deferredPrompt]);

  /* ------------------ SERVICE WORKER REGISTRATION (MODIFIZIERT FÜR DEV/PROD) ------------------ */
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerServiceWorker = async () => {
        try {
          // Registriere deinen Service Worker (sw.js) für alle Umgebungen
          const registration = await navigator.serviceWorker.register(
            '/sw.js',
            {
              scope: '/', // Stellt sicher, dass der SW den gesamten Ursprung abdeckt
              // updateViaCache: 'none', // 'none' kann bei der Entwicklung helfen, Updates schneller zu bekommen,
              // aber für Produktion ist das Standardverhalten oft besser.
              // Überlege, ob du das für Prod anders setzen willst.
            }
          );
          console.log(
            `[Layout] Service Worker registriert (Scope: ${registration.scope}). NODE_ENV: ${process.env.NODE_ENV}`
          );

          // Optional: Sofort nach Updates suchen lassen, besonders nützlich nach der ersten Registrierung
          // oder wenn du schnelle Updates erzwingen möchtest.
          registration.update();
        } catch (error) {
          console.error(
            '[Layout] Service Worker Registrierung fehlgeschlagen:',
            error
          );
        }
      };

      // Registriere den SW, sobald das Fenster geladen ist, um kritische Ressourcen nicht zu blockieren.
      // Du kannst dies auch früher tun, wenn es für deine App-Struktur besser passt.
      window.addEventListener('load', registerServiceWorker);

      // Periodisches Update-Check (optional, aber gut für langlebige PWAs)
      // Nur im Produktionsmodus, um im Entwicklungsmodus nicht unnötig zu pollen
      let updateIntervalId: NodeJS.Timeout | null = null;
      if (process.env.NODE_ENV === 'production') {
        updateIntervalId = setInterval(
          async () => {
            const registration =
              await navigator.serviceWorker.getRegistration();
            if (registration) {
              console.log('[Layout] Periodischer SW Update Check (PROD)...');
              registration.update();
            }
          },
          1000 * 60 * 15
        ); // z.B. alle 15 Minuten
      }

      return () => {
        window.removeEventListener('load', registerServiceWorker);
        if (updateIntervalId) {
          clearInterval(updateIntervalId);
        }
      };
    } else {
      console.log(
        '[Layout] Service Worker API nicht unterstützt in diesem Browser.'
      );
    }
  }, []);

  /* Toast für App-Update */
  useEffect(() => {
    if (appUpdateAvailable) {
      const toastId = 'app-update-toast';
      toast('Update verfügbar', {
        id: toastId,
        description:
          'Eine neue Version von Fbet ist bereit. Jetzt aktualisieren?',
        duration: Infinity,
        action: {
          label: 'Aktualisieren',
          onClick: () => {
            console.log(
              '[Layout] Update-Button geklickt. Rufe refreshApp() auf...'
            );
            refreshApp();
          },
        },
        icon: <RefreshCw className='w-5 h-5 text-primary' />,
      });
    }
  }, [appUpdateAvailable, refreshApp]);

  /* Capacitor Statusleiste */
  useEffect(() => {
    const configureStatusBar = async () => {
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
        try {
          await StatusBar.setOverlaysWebView({ overlay: false });
          console.log(
            'Capacitor: StatusBar.setOverlaysWebView auf false gesetzt.'
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

  // Das Haupt-Div für den Body-Inhalt, das immer gerendert wird,
  // einmal mit und einmal ohne ThemeProvider-Wrapper, je nach isClient-Status.
  const coreAppStructure = (
    <AuthProvider>
      <div
        className='flex flex-col min-h-dvh overflow-x-hidden bg-gradient-to-b
                      from-background to-slate-50 dark:from-slate-900 dark:to-slate-800
                      pb-[env(safe-area-inset-bottom)]
                      px-[env(safe-area-inset-left)]' // Korrigiert für beide Seiten, falls nötig
      >
        {hasMounted && !isOnline && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              backgroundColor: 'hsl(var(--destructive))',
              color: 'hsl(var(--destructive-foreground))',
              padding: '8px',
              textAlign: 'center',
              zIndex: 1000,
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
  );

  return (
    // suppressHydrationWarning ist hier korrekterweise entfernt!
    <html lang='de' className={`${inter.variable} ${firaCode.variable}`}>
      <Head>
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
        <title>Fbet App</title>
      </Head>
      <body className='font-sans antialiased'>
        {/* ThemeProvider wird nur clientseitig nach dem Mount gerendert, um Hydrierungsfehler zu vermeiden */}
        {isClient ? (
          <ThemeProvider
            attribute='class'
            defaultTheme='system' // oder 'light' als sicherer Fallback, falls 'system' Probleme macht
            enableSystem
            disableTransitionOnChange
          >
            {coreAppStructure}
          </ThemeProvider>
        ) : (
          // Fallback für Server-Render und allerersten Client-Render (bevor isClient true ist).
          // Rendert den Inhalt OHNE ThemeProvider-Wrapper.
          // Das `html`-Tag hat hier noch keine `dark`-Klasse vom ThemeProvider.
          // Das style={{ visibility: 'hidden' }} auf dem body oder html könnte Flackern vermeiden,
          // bis das Theme clientseitig geladen ist, ist aber optional.
          // Wichtiger ist, dass die Struktur für die Hydrierung übereinstimmt.
          <>{coreAppStructure}</>
        )}
      </body>
    </html>
  );
}
