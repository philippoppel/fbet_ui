import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Fira_Code } from 'next/font/google';
import './globals.css';

import { AuthProvider } from '@/app/context/AuthContext';
import { ThemeProvider } from '@/app/components/ThemeProvider';
import { Toaster } from '@/app/components/ui/sonner';
import { SiteLayout } from '@/app/components/layout/SiteLayout';

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

export const metadata: Metadata = {
  title: 'FBET',
  description: 'Wetten mit Freunden',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang='de'
      className={`${inter.variable} ${firaCode.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta name='apple-mobile-web-app-title' content='Fbet' />
        <meta name='application-name' content='Fbet' />
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
        <link rel='icon' type='image/svg+xml' href='/favicon.svg' />
        <link
          rel='apple-touch-icon'
          sizes='180x180'
          href='/apple-touch-icon.png'
        />
        <link rel='manifest' href='/manifest.json' />
      </head>
      <body className='font-sans antialiased flex flex-col min-h-screen'>
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
