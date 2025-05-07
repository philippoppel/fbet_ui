// src/components/ThemeProvider.tsx
'use client';

import * as React from 'react'; // Importiere React für ReactNode
import { ThemeProvider as NextThemesProvider } from 'next-themes';

// Füge eine explizite Typ-Annotation für die Props hinzu
export function ThemeProvider({
  children,
  ...props
}: {
  children: React.ReactNode;
  [key: string]: any;
}) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
