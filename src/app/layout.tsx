// src/app/layout.tsx
'use client';

import type { Metadata } from 'next'; // Behalte Metadaten, wenn du sie anderswo definierst
import { Inter, Fira_Code } from 'next/font/google';
import './globals.css';

import { ReactNode, useCallback, useEffect, useState } from 'react';
import { AuthProvider } from '@/app/context/AuthContext';
import { ThemeProvider } from '@/app/components/ThemeProvider';
import { Toaster } from '@/app/components/ui/sonner'; // Stelle sicher, dass toast hier importiert wird
import { SiteLayout } from '@/app/components/layout/SiteLayout';
import { Smartphone, Download } from 'lucide-react'; // Download wird im Toast verwendet
import { Button } from '@/app/components/ui/button';
import { toast } from 'sonner'; // Button wird im Toast verwendet

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
          // localStorage.setItem('fbetPwaInstallState', 'installed'); // Wird durch appinstalled gehandhabt
        } else {
          localStorage.setItem('fbetPwaInstallState', 'dismissed_prompt');
          toast.info('Installation abgebrochen', {
            description:
              'Du kannst die App später über das Browsermenü oder den Link auf der Startseite installieren.',
          });
        }
        setDeferredPrompt(null); // Wichtig: Prompt kann nur einmal verwendet werden
        setCanInstall(false); // Und canInstall entsprechend aktualisieren
      });
    } else {
      showManualHint();
    }
  }, [deferredPrompt]); // Abhängigkeit: deferredPrompt (showManualHint ist stabil, wenn außerhalb definiert)

  /* Capture beforeinstallprompt */
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
      // Entferne ggf. einen alten "dismissed_toast_permanently", wenn der Prompt wieder verfügbar wird
      // (optional, je nach gewünschtem Verhalten)
      // if (localStorage.getItem('fbetPwaInstallState') === 'dismissed_toast_permanently') {
      //   localStorage.removeItem('fbetPwaInstallState');
      // }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  /* Listen to successful install */
  useEffect(() => {
    const onInstalled = () => {
      toast.success('Fbet wurde installiert ✅');
      localStorage.setItem('fbetPwaInstallState', 'installed');
      setCanInstall(false); // App ist installiert, keine weitere Aufforderung nötig
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
          (
            t // KORREKTUR: t ist hier die ID des Toasts
          ) => (
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
                    toast.dismiss(t); // KORREKTUR: t statt t.id
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
  }, [canInstall, handleInstallClick, deferredPrompt]); // KORREKTUR: Abhängigkeiten geprüft

  /* ------------------ SW REGISTRATION ------------------ */
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const regSw = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        reg.update();
      } catch (err) {
        console.error('[Layout] SW registration failed', err);
      }
    };
    window.addEventListener('load', regSw);
    return () => window.removeEventListener('load', regSw);
  }, []);

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
          content='width=device-width,initial-scale=1,maximum-scale=1'
        />
        <meta name='apple-mobile-web-app-capable' content='yes' />
        <meta name='apple-mobile-web-app-status-bar-style' content='default' />
        <meta name='apple-mobile-web-app-title' content='Fbet' />
        {/* Du hattest theme-color #000000, was gut für Dark Mode sein kann.
            Wenn du willst, dass es sich an den System-Theme anpasst oder hell ist,
            kannst du es anpassen oder den ThemeProvider das steuern lassen.
            Für PWA ist es oft gut, eine Standard-Farbe zu haben. */}
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
            <div className='flex flex-col min-h-dvh bg-gradient-to-b from-background to-slate-50 dark:from-slate-900 dark:to-slate-800'>
              <SiteLayout>{children}</SiteLayout>
            </div>
            {/* PWAPromptMobile wurde entfernt, da der Hinweis nun nach Login kommt */}
            <Toaster richColors position='top-center' />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
