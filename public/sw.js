// public/sw.js

// NEU: Separate Cache-Namen für bessere Verwaltung
const APP_SHELL_CACHE_NAME = 'fbet-app-shell-v2.1'; // WICHTIG: Erhöhe die Version (v2, v3...), wenn du die App-Shell-Dateien (unten in urlsToCacheForAppShell) änderst!
const DATA_CACHE_NAME = 'fbet-data-cache-v1';    // Für dynamische Daten von deinen APIs

// Dateien, die zur App-Shell gehören und beim Installieren gecached werden.
const urlsToCacheForAppShell = [
  '/', // Deine Startseite
  '/manifest.json',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png',
  // '/web-app-manifest-maskable-192x192.png', // Falls du Maskable Icons hast
  // '/web-app-manifest-maskable-512x512.png', // Falls du Maskable Icons hast
  // '/offline.html' // Empfehlung: Eine Offline-Fallback-Seite erstellen und hier hinzufügen
];

// Installation: App-Shell-Assets in den Cache laden
self.addEventListener('install', (event) => {
  console.log('[SW] Install Event: Caching App-Shell-Assets.');
  event.waitUntil(
    caches.open(APP_SHELL_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching für App Shell:', urlsToCacheForAppShell);
        return cache.addAll(urlsToCacheForAppShell);
      })
      .then(() => {
        console.log('[SW] App-Shell-Assets erfolgreich gecached.');
        return self.skipWaiting(); // Wichtig: Neuer SW übernimmt sofort Kontrolle
      })
      .catch(error => {
        console.error('[SW] Fehler beim Cachen der App-Shell-Assets:', error);
      })
  );
});

// Aktivierung: Alte Caches löschen
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate Event: Alte Caches werden gelöscht und Clients übernommen.');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Lösche alle Caches, die nicht unseren aktuell definierten Cache-Namen entsprechen
          if (cacheName !== APP_SHELL_CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
            console.log('[SW] Lösche alten Cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Clients werden übernommen.');
      return self.clients.claim(); // Übernimmt Kontrolle über alle offenen Clients
    })
  );
});

// Fetch: Anfragen abfangen und passende Cache-Strategie anwenden
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Nur GET-Anfragen behandeln wir mit Caching-Strategien
  if (request.method !== 'GET') {
    // Für POST, PUT, DELETE etc. direkt ans Netzwerk, keine Cache-Interaktion durch den SW.
    // console.log('[SW] Bearbeite nicht-GET Anfrage direkt vom Netzwerk:', request.method, request.url);
    return; // Lässt den Browser die Anfrage normal behandeln
  }

  // Strategie für API-Anfragen (z.B. alles unter /api/)
  // Hier: Stale-While-Revalidate (aus Cache schnell, dann im Hintergrund aktualisieren)
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    // console.log('[SW] API Anfrage (Stale-While-Revalidate):', request.url);
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            // Wenn die Netzwerkantwort gültig ist, aktualisiere den Cache
            if (networkResponse && networkResponse.ok) {
              // console.log('[SW] Aktualisiere Daten-Cache für:', request.url);
              cache.put(request, networkResponse.clone()); // Wichtig: Response klonen
            }
            return networkResponse;
          }).catch(error => {
            console.warn('[SW] Netzwerk-Fetch für API fehlgeschlagen:', request.url, error);
            // Wenn Netzwerk fehlschlägt und nichts im Cache ist, wird der Fehler weitergegeben.
            // Du könntest hier eine generische Offline-JSON-Antwort für APIs zurückgeben, falls gewünscht.
          });

          // Gebe die gecachte Antwort sofort zurück, falls vorhanden,
          // andernfalls warte auf die Netzwerkantwort (fetchPromise).
          return cachedResponse || fetchPromise;
        });
      })
    );
  }
    // Strategie für App-Shell-Assets und andere statische Ressourcen der eigenen Domain
  // Hier: Cache First, dann Netzwerk (gut für JS/CSS Chunks von Next.js, Bilder etc.)
  else if (url.origin === self.location.origin) {
    // console.log('[SW] App/Statische Anfrage (Cache First):', request.url);
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // console.log('[SW] Liefere aus App-Shell-Cache:', request.url);
          return cachedResponse; // Aus dem Cache servieren
        }

        // Nicht im Cache (oder Cache-Miss bei Navigation), also vom Netzwerk holen
        // console.log('[SW] Hole vom Netzwerk (App/Statisch):', request.url);
        return fetch(request).then((networkResponse) => {
          // Wichtig: Nur gültige Antworten cachen (Status 2xx)
          // Und nur, wenn es sich nicht um eine API-Anfrage handelt (die oben schon behandelt wird)
          // oder um Streams (wie Server-Sent Events), die man nicht ohne Weiteres cachen sollte.
          if (networkResponse && networkResponse.ok && !url.pathname.startsWith('/api/')) {
            const responseToCache = networkResponse.clone();
            caches.open(APP_SHELL_CACHE_NAME).then((cache) => {
              // console.log('[SW] Cache App/Statische Ressource dynamisch:', request.url);
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Offline-Fallback, falls gewünscht und gecached (z.B. für Navigationsanfragen)
          // if (request.mode === 'navigate' && urlsToCacheForAppShell.includes('/offline.html')) {
          //   console.log('[SW] Liefere Offline-Fallback-Seite für Navigation.');
          //   return caches.match('/offline.html');
          // }
          // Ansonsten wird der Fehler weitergegeben, wenn nichts geladen werden kann.
        });
      })
    );
  }
  // Für Cross-Origin-Anfragen (z.B. Google Fonts, externe Bilder) nicht eingreifen.
  // Der Browser behandelt sie normal (Netzwerk, eigener HTTP-Cache des Browsers).
  // Wenn du Cross-Origin-Ressourcen cachen möchtest, brauchst du eine explizite Strategie
  // und der Server der Ressource muss CORS korrekt konfiguriert haben.
});

// Nachrichten vom Client empfangen (z.B. für SKIP_WAITING)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING Nachricht vom Client empfangen. Aktiviere neuen SW.');
    self.skipWaiting();
  }
});