// public/sw.js

// Dein bestehender Cache-Name und URLs
const APP_SHELL_CACHE_NAME = 'fbet-app-shell-v2.1.7'; // Behalte deinen aktuellen Cache-Namen
const urlsToCacheForAppShell = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png',
  // '/offline.html', // Falls du eine Offline-Fallback-Seite hast
];

// ------------- DEIN BESTEHENDER INSTALL HANDLER -------------
self.addEventListener('install', (event) => {
  console.log('[SW] Install Event: Caching App-Shell.');
  event.waitUntil(
    caches.open(APP_SHELL_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching App-Shell:', urlsToCacheForAppShell);
        return cache.addAll(urlsToCacheForAppShell);
      })
      .then(() => self.skipWaiting()) // Wichtig: Neuer SW wird schneller aktiv
      .catch((error) => {
        console.error('[SW] Fehler beim Cachen der App-Shell:', error);
      })
  );
});

// ------------- DEIN BESTEHENDER ACTIVATE HANDLER -------------
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate Event: Alte Caches bereinigen.');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== APP_SHELL_CACHE_NAME /* && andereCachesNichtLoeschen */) {
            console.log('[SW] Lösche alten Cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Wichtig: SW übernimmt Kontrolle über offene Clients
  );
});

// ------------- DEIN BESTEHENDER FETCH HANDLER -------------
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    // API-Anfragen (auch /api/push/subscribe) gehen immer ans Netzwerk
    event.respondWith(fetch(request));
    return;
  }

  if (request.method === 'GET' && urlsToCacheForAppShell.includes(url.pathname)) {
    // Cache-First für App Shell Ressourcen
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          // Optional: hier könnte man die Antwort auch cachen, wenn sie nicht Teil der initialen urlsToCacheForAppShell ist
          return networkResponse;
        });
      })
    );
    return;
  }
  // Für andere Anfragen (z.B. statische Assets, die nicht Teil der Shell sind, oder externe URLs),
  // kannst du eine andere Strategie wählen oder es dem Browser überlassen (kein event.respondWith).
  // Dein aktueller Fetch-Handler ist schon recht gut für App-Shell + API.
});


// ------------- NEU: PUSH EVENT HANDLER -------------
self.addEventListener('push', function (event) {
  console.log('[SW] Push Received.');
  let notificationData = {
    title: 'fbet Benachrichtigung',
    body: 'Etwas Neues ist passiert!',
    icon: '/icon1.png', // Standard-Icon
    data: { url: '/' } // Standard-URL
  };

  if (event.data) {
    try {
      const incomingData = event.data.json();
      // Überschreibe Standardwerte mit den Daten aus dem Push-Payload
      notificationData = { ...notificationData, ...incomingData };
      // Stelle sicher, dass eine URL in den Daten ist, auch wenn sie im Payload fehlt
      if (!notificationData.data || !notificationData.data.url) {
        notificationData.data = { url: '/' };
      }
      if (!notificationData.icon) { // Fallback Icon
        notificationData.icon = '/icon1.png';
      }
      console.log('[SW] Push data: ', notificationData);
    } catch (e) {
      console.error('[SW] Error parsing push data json', e);
      // Nutze Standardwerte, wenn JSON-Parsing fehlschlägt
    }
  }

  const title = notificationData.title;
  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: '/icon0.svg', // Kleines Icon für Android Status Bar (optional)
    data: notificationData.data, // Wichtig für Klick-Aktion
    tag: `event-${notificationData.data?.event_id || Date.now()}` // Verhindert Duplikate bei schnellen Pushes zum selben Event
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ------------- NEU: NOTIFICATION CLICK HANDLER -------------
self.addEventListener('notificationclick', function (event) {
  console.log('[SW] Notification click Received.');
  event.notification.close(); // Schließe die Benachrichtigung

  const urlToOpen = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Prüfe, ob ein Fenster mit der Ziel-URL bereits offen ist
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        // Ggf. genauer prüfen, ob client.url exakt passt oder nur der Hostname
        if (client.url === self.location.origin + urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Wenn kein passendes Fenster offen ist, öffne ein neues
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// ------------- DEIN BESTEHENDER MESSAGE HANDLER -------------
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING empfangen → aktiviere neuen SW.');
    self.skipWaiting();
  }
});