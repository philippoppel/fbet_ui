// src/app/components/layout/SiteLayout.tsx
'use client';

import React from 'react';
import { useAuth } from '@/app/context/AuthContext';
// AppHeader Import ist hier, wird aber in der Funktion nicht global verwendet.
// Er wird spezifisch in der DashboardPage importiert und genutzt.
// import { AppHeader } from '@/app/components/layout/AppHeader';
import { Footer } from '@/app/components/layout/Footer';

export function SiteLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth(); // Wird hier geholt, aber nicht direkt verwendet (z.B. für einen globalen Header)

  return (
    <>
      {/* Wenn du einen globalen Header für alle Seiten (außer vielleicht Landingpage) wolltest,
        könntest du ihn hier einfügen und konditional rendern, z.B. basierend auf der Route oder user Status.
        <AppHeader user={user} onLogout={logout} ... />
      */}
      <main className='flex-grow'>{children}</main>
      <Footer />
    </>
  );
}
