// public/sw.js
const CACHE_NAME = 'fbet-cache-v2'; // WICHTIG: Ändere 'v1', 'v2' etc., wenn du den SW aktualisierst!
const urlsToCache = [
  '/',
  '/manifest.json',
  // Füge hier Pfade zu wichtigen statischen Assets hinzu (z.B. globale CSS, JS-Chunks, Favicons)
  // Beispiel:
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png',
  '/web-app-manifest-maskable-192x192.png',
  '/web-app-manifest-maskable-512x512.png',
  // '/_next/static/css/dein-globales-css.css', // Pfad anpassen!
  // '/_next/static/chunks/main-app.js',     // Pfad anpassen!
  // Du kannst auch eine Offline-Fallback-Seite cachen:
  // '/offline.html'
];

// Installation: Cache öffnen und Core Assets hinzufügen
self.addEventListener('install', (event) => {
  console.log('[SW] Install Event. Caching core assets.');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching: ', urlsToCache);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] Core assets cached. Ready to activate.');
        return self.skipWaiting(); // Wichtig: Neuer SW übernimmt sofort Kontrolle
      })
      .catch(error => {
        console.error('[SW] Failed to cache core assets:', error);
      })
  );
});

// Aktivierung: Alte Caches löschen
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate Event. Claiming clients and cleaning old caches.');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim(); // Übernimmt Kontrolle über alle offenen Clients
    })
  );
});

// Fetch: Anfragen abfangen und Cache-Strategie anwenden
self.addEventListener('fetch', (event) => {
  // Nur GET-Anfragen von der eigenen Domain mit Cache-First-Strategie behandeln
  if (event.request.method === 'GET' && event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Aus Cache servieren
            // console.log('[SW] Serving from cache:', event.request.url);
            return cachedResponse;
          }
          // Nicht im Cache, vom Netzwerk holen und optional cachen
          // console.log('[SW] Fetching from network:', event.request.url);
          return fetch(event.request).then((networkResponse) => {
            // Optional: Dynamisch geladene Ressourcen cachen
            // if (networkResponse.ok) {
            //   const responseToCache = networkResponse.clone();
            //   caches.open(CACHE_NAME).then((cache) => {
            //     cache.put(event.request, responseToCache);
            //   });
            // }
            return networkResponse;
          }).catch(() => {
            // Offline-Fallback, falls gewünscht und gecached
            // if (event.request.mode === 'navigate') {
            //   return caches.match('/offline.html');
            // }
            // Fallback, wenn weder Cache noch Netzwerk verfügbar sind
            // Hier könnte eine generische Offline-Antwort stehen
          });
        })
    );
  } else {
    // Für andere Anfragen (POST, externe Domains etc.) direkt ans Netzwerk
    return; // Lässt den Browser die Anfrage normal behandeln
  }
});

// Nachrichten vom Client empfangen (z.B. für SKIP_WAITING)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING message received. Activating new SW.');
    self.skipWaiting();
  }
});