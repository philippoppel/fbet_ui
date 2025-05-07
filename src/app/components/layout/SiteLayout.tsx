// src/components/layout/SiteLayout.tsx
'use client'; // <--- SEHR WICHTIG: Markiert diese Komponente als Client-Komponente

import React from 'react'; // Import React (gute Praxis)
import { useAuth } from '@/app/context/AuthContext'; // Importiere den Hook
import { AppHeader } from '@/app/components/layout/AppHeader'; // Importiere Header
import { Footer } from '@/app/components/layout/Footer'; // Importiere Footer

// Die Funktion, die den Hauptteil des Layouts rendert und useAuth verwendet
export function SiteLayout({ children }: { children: React.ReactNode }) {
  // Hole User und Logout-Funktion aus dem Context (funktioniert, da wir 'use client' sind)
  const { user, logout } = useAuth();

  return (
    <>
      {/* Das <main>-Tag umschließt den eigentlichen Seiteninhalt (children) */}
      {/* flex-grow sorgt dafür, dass dieser Bereich den verfügbaren Platz ausfüllt */}
      <main className='flex-grow'>{children}</main>

      {/* Rendere den Footer */}
      <Footer />
    </>
  );
}
