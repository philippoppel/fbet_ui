// src/app/layout.tsx
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import { SiteLayout } from '@/components/layout/SiteLayout';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'FBET',
  description: 'Wetten mit Freunden',
  // Icons können hier bleiben, oder wie unten im head platziert werden
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='de' suppressHydrationWarning>
      {/* Hier beginnt der Head-Bereich */}
      <head>
        {/* ====> HIER DAS FEHLENDE TAG EINFÜGEN <==== */}
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        {/* Ggf. Favicon-Links hierher verschieben, wenn nicht in metadata */}
        <link rel='icon' href='/favicon.ico' sizes='any' />
        <link rel='icon' href='/icon.svg' type='image/svg+xml' />
        <link rel='apple-touch-icon' href='/apple-icon.png' />
        {/* Weitere head-Elemente falls nötig */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased flex flex-col min-h-screen`}
      >
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <SiteLayout>{children}</SiteLayout>
            <Toaster richColors position='top-center' />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
