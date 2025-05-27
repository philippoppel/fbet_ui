// src/app/layout.tsx
'use client';

// Remove: import type { Metadata } from 'next'; // No longer exporting metadata from here

import { Inter, Fira_Code } from 'next/font/google';
import './globals.css';

import { ReactNode, useCallback, useEffect, useState } from 'react';
import { AuthProvider } from '@/app/context/AuthContext';
import { ThemeProvider } from '@/app/components/ThemeProvider';
import { Toaster } from '@/app/components/ui/sonner';
import { SiteLayout } from '@/app/components/layout/SiteLayout';
import { Smartphone, Download } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { toast } from 'sonner';

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
      ? 'Am Besten einloggen & dann Teilen‑/Actions‑Button → "Zum Home‑Bildschirm"'
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
          // The 'appinstalled' event handles the toast and localStorage.
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

  /* useEffect for the post-login installation toast */
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
          content='width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no'
        />
        {/* PWA-specific meta tags */}
        <meta name='application-name' content='Fbet' />
        <meta name='apple-mobile-web-app-capable' content='yes' />
        <meta name='apple-mobile-web-app-status-bar-style' content='default' />
        <meta name='apple-mobile-web-app-title' content='Fbet' />
        <meta
          name='description'
          content='Tippe auf spannende Events mit Fbet!'
        />{' '}
        {/* Keep this */}
        <meta name='format-detection' content='telephone=no' />
        <meta name='mobile-web-app-capable' content='yes' />
        <meta name='msapplication-TileColor' content='#2B5797' />
        <meta name='msapplication-tap-highlight' content='no' />
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
        {/* Links for icons and manifest */}
        <link
          rel='apple-touch-icon'
          sizes='180x180'
          href='/apple-touch-icon.png'
        />
        <link rel='icon' href='/favicon.ico' />
        <link rel='manifest' href='/manifest.json' /> {/* This is crucial */}
      </head>
      <body className='font-sans antialiased'>
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <div className='flex flex-col min-h-dvh overflow-x-hidden bg-gradient-to-b from-background to-slate-50 dark:from-slate-900 dark:to-slate-800'>
              <SiteLayout>{children}</SiteLayout>
            </div>
            <Toaster richColors position='top-center' />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
