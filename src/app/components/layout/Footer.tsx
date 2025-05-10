// src/app/components/layout/Footer.tsx
import Link from 'next/link';

export function Footer() {
  return (
    // bg-background entfernt, um den Seitengradienten durchscheinen zu lassen
    // border-t beibehalten für eine saubere Trennung vom Inhalt darüber
    // text-opacity oder eine leicht andere Textfarbe könnte nötig sein,
    // je nachdem, wie gut der Kontrast am unteren Rand des Gradienten ist.
    <footer className='py-6 md:px-8 md:py-0 border-t border-border/60 bg-transparent text-center'>
      {/* text-center hinzugefügt */}
      <div className='container flex flex-col items-center justify-center gap-4 md:h-24 md:flex-row'>
        <p className='text-sm leading-loose text-muted-foreground'>
          © {new Date().getFullYear()} fbet - Wetten mit Freunden.
          <Link
            href='/impressum'
            className='ml-2 md:ml-4 underline underline-offset-4 hover:text-primary transition-colors'
          >
            Impressum
          </Link>
          <Link
            href='/datenschutz'
            className='ml-2 md:ml-4 underline underline-offset-4 hover:text-primary transition-colors'
          >
            Datenschutz
          </Link>
        </p>
        {/* Hier könntest du weitere Footer-Elemente hinzufügen, z.B. Social Media Links
          Beispiel:
          <div className="flex gap-4">
            <Link href="#" aria-label="Facebook" className="text-muted-foreground hover:text-primary"><FacebookIcon size={18} /></Link>
            <Link href="#" aria-label="Twitter" className="text-muted-foreground hover:text-primary"><TwitterIcon size={18} /></Link>
          </div>
        */}
      </div>
    </footer>
  );
}
