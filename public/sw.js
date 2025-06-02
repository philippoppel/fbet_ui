
const APP_SHELL_CACHE_NAME = 'fbet-app-shell-v2.0.4';

const urlsToCacheForAppShell = [
  '/', // Startseite
  '/manifest.json',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png',
  // Optional: '/offline.html'
];

// Installation → App-Shell cachen
self.addEventListener('install', (event) => {
  console.log('[SW] Install Event: Caching App-Shell.');
  event.waitUntil(
    caches.open(APP_SHELL_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching App-Shell:', urlsToCacheForAppShell);
        return cache.addAll(urlsToCacheForAppShell);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[SW] Fehler beim Cachen der App-Shell:', error);
      })
  );
});

// Aktivierung → Alte Caches löschen
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate Event: Alte Caches bereinigen.');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== APP_SHELL_CACHE_NAME) {
            console.log('[SW] Lösche alten Cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch → App-Shell Caching, API → Network Only
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1️⃣ API → Immer Network Only
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    console.log('[SW] API Call → Network Only:', request.url);
    event.respondWith(fetch(request));
    return;
  }

  // 2️⃣ App-Shell / statische Ressourcen → Cache First
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            caches.open(APP_SHELL_CACHE_NAME).then((cache) => {
              cache.put(request, networkResponse.clone());
            });
          }
          return networkResponse;
        }).catch(() => {
          // Optional: Offline-Fallback
          // return caches.match('/offline.html');
        });
      })
    );
  }

  // 3️⃣ Externe Ressourcen → Standard Browser Handling (kein Eingriff)
});

// Nachrichten vom Client (z.B. SKIP_WAITING)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING empfangen → aktiviere neuen SW.');
    self.skipWaiting();
  }
});
