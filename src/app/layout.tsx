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
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <link rel='icon' href='/favicon.ico' sizes='any' />
        <link rel='apple-icon' href='/apple-icon.png' />
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
