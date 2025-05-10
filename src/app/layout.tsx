'use client';

import type { Metadata } from 'next';
import { Inter, Fira_Code } from 'next/font/google';
import './globals.css';

import { ReactNode, useCallback, useEffect, useState } from 'react';
import { AuthProvider } from '@/app/context/AuthContext';
import { ThemeProvider } from '@/app/components/ThemeProvider';
import { Toaster } from '@/app/components/ui/sonner';
import { SiteLayout } from '@/app/components/layout/SiteLayout';
import { Smartphone, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';

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

/* ------------------ Mobile Install Prompt ------------------ */
const PWAPromptMobile: React.FC<{
  onInstall: () => void;
  canInstall: boolean;
}> = ({ onInstall, canInstall }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const mobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (mobile && canInstall) {
      const timer = setTimeout(() => setVisible(true), 2500);
      return () => clearTimeout(timer);
    }
  }, [canInstall]);

  if (!visible) return null;

  return (
    <div className='md:hidden fixed bottom-4 left-4 right-4 z-50'>
      <div className='bg-secondary text-secondary-foreground p-4 rounded-lg shadow-xl flex items-center justify-between'>
        <div className='flex items-center'>
          <Smartphone className='w-6 h-6 mr-3' />
          <div>
            <h4 className='font-semibold'>App installieren?</h4>
            <p className='text-sm'>Zum Startbildschirm hinzufügen 📱</p>
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

/* ------------------ ROOT LAYOUT ------------------ */
export default function RootLayout({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

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
    const onInstalled = () => toast.success('Fbet wurde installiert ✅');
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

  /* Install click */
  const handleInstallClick = useCallback(() => {
    if (deferredPrompt) {
      (deferredPrompt as any).prompt();
      (deferredPrompt as any).userChoice.then((choice: any) => {
        if (choice.outcome !== 'accepted') showManualHint();
        setDeferredPrompt(null);
        setCanInstall(false);
      });
    } else {
      showManualHint();
    }
  }, [deferredPrompt]);

  /* ⇢ Listen for global manual dispatch (Landing‑Page link) */
  useEffect(() => {
    const handler = () => handleInstallClick();
    window.addEventListener('requestPWAInstall', handler);
    return () => window.removeEventListener('requestPWAInstall', handler);
  }, [handleInstallClick]);

  /* Manual instructions */
  const showManualHint = () => {
    const txt = isiOS()
      ? 'Teile‑/Actions‑Button → "Zum Home‑Bildschirm"'
      : isAndroid()
        ? 'Chrome-Menü → "Zum Home‑Bildschirm"'
        : 'Installationsoption im Browser-Menü';
    toast.info('Manuelle Installation', { description: txt, duration: 8000 });
  };

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
        <meta name='theme-color' content='#000000' />
        <link rel='manifest' href='/manifest.json' />
        <link rel='icon' href='/favicon.ico' />
        <link
          rel='apple-touch-icon'
          sizes='180x180'
          href='/apple-touch-icon.png'
        />
        <link rel='icon' type='image/svg+xml' href='/favicon.svg' />
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
            <PWAPromptMobile
              onInstall={handleInstallClick}
              canInstall={canInstall}
            />
            <Toaster richColors position='top-center' />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
