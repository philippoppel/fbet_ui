// src/components/layout/Footer.tsx
import Link from 'next/link';

export function Footer() {
  return (
    <footer className='py-6 md:px-8 md:py-0 border-t bg-background'>
      {' '}
      {/* Hintergrund hinzugefügt */}
      <div className='container flex flex-col items-center justify-center gap-4 md:h-24 md:flex-row'>
        {' '}
        {/* Zentriert */}
        <p className='text-center text-sm leading-loose text-muted-foreground'>
          © {new Date().getFullYear()} fbet - Wetten mit Freunden.
          {/* Platzhalter für Links - WICHTIG: Echte Links einfügen! */}
          <Link
            href='/impressum'
            className='ml-4 underline underline-offset-4 hover:text-primary'
          >
            Impressum
          </Link>
          <Link
            href='/datenschutz'
            className='ml-4 underline underline-offset-4 hover:text-primary'
          >
            Datenschutz
          </Link>
        </p>
        {/* Hier könntest du weitere Footer-Elemente hinzufügen, z.B. Social Media Links */}
      </div>
    </footer>
  );
}
