// next.config.ts
import type { NextConfig } from 'next';

const pwaConfig = {
  // Zielverzeichnis für die PWA-Dateien (Service Worker, Manifest etc.)
  dest: 'public',
  // Service Worker sofort registrieren
  register: true,
  // Neuen Service Worker sofort aktivieren, ohne auf das Schließen aller Tabs zu warten
  skipWaiting: true,
  // PWA im Development-Modus deaktivieren (optional, aber oft nützlich)
  disable: process.env.NODE_ENV === 'development',
  // Cache-Seiten bei Navigation für schnellere Übergänge
  cacheOnNavigation: true,
  // App neu laden, wenn wieder eine Online-Verbindung besteht
  reloadOnOnline: true,
  // Definiert den Inhalt des generierten manifest.json
  manifest: {
    name: 'Fbet - Deine Tipp App',
    short_name: 'Fbet',
    description: 'Tippe auf spannende Events mit Fbet!',
    start_url: '/', // Start-URL der PWA
    display: 'standalone', // Wie die PWA angezeigt wird (standalone, fullscreen, minimal-ui)
    background_color: '#ffffff', // Hintergrundfarbe für den Splash-Screen
    theme_color: '#000000', // Theme-Farbe der PWA (Toolbar-Farbe etc.)
    orientation: 'portrait-primary', // Bevorzugte Ausrichtung
    icons: [
      {
        src: '/icons/icon-72x72.png', // Pfad zu deinem Icon im /public Ordner
        sizes: '72x72',
        type: 'image/png',
        purpose: 'any', // 'any' oder 'maskable'
      },
      {
        src: '/icons/icon-96x96.png',
        sizes: '96x96',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-128x128.png',
        sizes: '128x128',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-144x144.png',
        sizes: '144x144',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-152x152.png',
        sizes: '152x152',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192x192.png', // Ein gängiges Format für Android
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-384x384.png',
        sizes: '384x384',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png', // Ein gängiges Format für Android Splash Screens
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/maskable-icon-192x192.png', // Maskable Icon für adaptive Icons auf Android
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/maskable-icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      // Dein Apple Touch Icon kann auch hier referenziert werden,
      // obwohl der <link rel="apple-touch-icon"> Tag im <head> wichtiger ist.
      {
        src: '/apple-touch-icon.png', // Stelle sicher, dass diese Datei in /public existiert
        sizes: '180x180', // Typische Größe für apple-touch-icon
        type: 'image/png',
        purpose: 'any',
      },
    ],
    // Optional: Screenshots für eine verbesserte Installationsaufforderung
    // screenshots: [
    //   {
    //     src: '/screenshots/screenshot1.png',
    //     sizes: '1080x1920',
    //     type: 'image/png',
    //   },
    // ],
  },
  // Fallback-Seiten für Offline-Zugriff (optional, aber empfohlen)
  fallbacks: {
    document: '/_offline', // Erstelle eine Seite unter src/app/_offline/page.tsx
    // image: '/static/images/fallback.png', // Fallback-Bild
    // font: '/static/fonts/fallback.woff2',    // Fallback-Font
  },
  // Caching-Strategien für verschiedene Arten von Anfragen
  runtimeCaching: [
    {
      // Für die Authentifizierungs-Route (/api/auth/me)
      // NetworkFirst: Versuche zuerst das Netzwerk, falle auf Cache zurück, wenn offline.
      urlPattern: /^https?:\/\/[^\/]+\/api\/auth\/me$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-auth-cache',
        networkTimeoutSeconds: 3, // Zeitlimit für Netzwerk, bevor Fallback
        expiration: {
          maxEntries: 1, // Nur den letzten /me Aufruf cachen
          maxAgeSeconds: 2 * 60, // 2 Minuten (sehr kurz halten für Auth-Status)
        },
        cacheableResponse: {
          statuses: [200], // Nur erfolgreiche Antworten (Status 200) cachen!
        },
      },
    },
    {
      // Für andere API-Routen (Daten, etc.)
      // StaleWhileRevalidate: Schnell aus dem Cache bedienen, im Hintergrund aktualisieren.
      urlPattern: /^https?:\/\/[^\/]+\/api\/.*/, // Alle anderen /api/... Routen
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'api-data-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 1 * 60 * 60, // 1 Stunde (oder je nach Bedarf anpassen)
        },
        cacheableResponse: {
          statuses: [200], // Nur erfolgreiche Antworten cachen
        },
      },
    },
    {
      // Caching für Next.js Build-Assets (JS, CSS, etc. aus _next/static)
      // next-pwa kümmert sich oft automatisch darum (durch workboxOpts.globPatterns),
      // aber eine explizite Regel kann helfen.
      urlPattern: /\/_next\/(static|image|media)\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-build-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Tage
        },
      },
    },
    {
      // Caching für Schriftarten (von Google Fonts oder selbst gehostet)
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-cache',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 Jahr
        },
      },
    },
    {
      // Caching für andere statische Assets (z.B. Icons, Bilder direkt in /public)
      urlPattern:
        /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css|png|jpg|jpeg|svg|gif|ico|webp|avif|webmanifest)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Tage
        },
      },
    },
  ],
  // Zusätzliche Workbox-Optionen (für fortgeschrittene Anwendungsfälle)
  // workboxOptions: {
  //   globPatterns: ['public/fonts/**', 'public/images/**'], // Beispiel, um bestimmte Ordner aggressiver zu precachen
  //   // Weitere Optionen: https://developer.chrome.com/docs/workbox/reference/workbox-build/#type-WebpackGenerateSWOptions
  // },
};

// Importiere next-pwa
const withPWA = require('@ducanh2912/next-pwa').default(pwaConfig);

// Deine reguläre Next.js Konfiguration
const nextConfig: NextConfig = {
  reactStrictMode: true, // Oder false, je nach deinen Präferenzen im Development
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'utfs.io', // Deine UploadThing Domain
        pathname: '/f/**',
      },
      {
        protocol: 'https',
        hostname: 'img.icons8.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Für Google User Avatare
      },
      // Füge hier weitere erlaubte Domains für Bilder hinzu
    ],
  },
  eslint: {
    // ESLint-Fehler während des Builds ignorieren (Vorsicht damit!)
    ignoreDuringBuilds: true,
  },
  // Für lokale Entwicklung über HTTPS im LAN (optional)
  // devIndicators: {
  //   buildActivity: true,
  //   buildActivityPosition: 'bottom-right',
  // },
  // experimental: {
  //   // Hier können experimentelle Next.js Features aktiviert werden
  // },
};

// Exportiere die Konfiguration mit PWA-Unterstützung
export default withPWA(nextConfig);
