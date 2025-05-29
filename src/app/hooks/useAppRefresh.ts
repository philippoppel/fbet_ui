// src/app/hooks/useAppRefresh.ts
'use client';

import { useEffect, useState, useCallback } from 'react';

export const useAppRefresh = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  // Zustand für den wartenden Service Worker
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null
  );
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  /**
   * Löst das Update des Service Workers aus (wenn einer wartet) und lädt die Seite neu.
   * Der eigentliche Reload wird durch das 'controllerchange'-Event ausgelöst.
   */
  const refresh = useCallback(() => {
    if (waitingWorker) {
      console.log(
        '[AppRefresh] Sende SKIP_WAITING an den wartenden Service Worker.'
      );
      // Sende eine Nachricht an den wartenden Service Worker, damit er self.skipWaiting() aufruft.
      // Dein sw.js ruft zwar schon self.skipWaiting() im 'install'-Event auf,
      // diese Nachricht stellt aber sicher, dass er aktiviert wird, falls er doch noch wartet.
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // Falls kein wartender Worker da ist (z.B. manueller Refresh-Wunsch ohne Update)
      console.log('[AppRefresh] Kein wartender Worker. Lade Seite direkt neu.');
      window.location.reload();
    }
  }, [waitingWorker]);

  /* Erkenne neue Service-Worker-Installationen und lausche auf Controller-Änderung */
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return () => {}; // Return leere Cleanup-Funktion

    const swRegistrationPromise = navigator.serviceWorker.ready;

    swRegistrationPromise.then((registration) => {
      // 1. Prüfen, ob bereits ein SW wartet (z.B. nach einem Hard-Refresh)
      if (registration.waiting) {
        console.log('[AppRefresh] Initial: Service Worker wartet bereits.');
        setWaitingWorker(registration.waiting);
        setUpdateAvailable(true);
      }

      // 2. Lauschen auf 'updatefound' -> neuer SW wird installiert
      registration.addEventListener('updatefound', () => {
        console.log(
          '[AppRefresh] Event: updatefound - Neuer Service Worker wird installiert.'
        );
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.addEventListener('statechange', () => {
            console.log(
              `[AppRefresh] Event: statechange - Neuer SW Status: ${installingWorker.state}`
            );
            if (installingWorker.state === 'installed') {
              // Neuer SW ist installiert. Wenn ein aktiver Controller existiert, ist dies ein Update.
              if (navigator.serviceWorker.controller) {
                console.log(
                  '[AppRefresh] Neuer SW installiert, alter SW noch aktiv. Update verfügbar.'
                );
                // Der 'installingWorker' ist jetzt der 'waitingWorker', oder registration.waiting
                setWaitingWorker(registration.waiting || installingWorker);
                setUpdateAvailable(true);
              } else {
                // Kein aktiver Controller, dies ist die erste SW-Aktivierung.
                console.log(
                  '[AppRefresh] Neuer SW installiert, kein vorheriger aktiver SW. Erste Aktivierung.'
                );
              }
            }
          });
        }
      });
    });

    // 3. Lauschen auf 'controllerchange' -> neuer SW hat die Kontrolle übernommen
    let refreshingPage = false;
    const handleControllerChange = () => {
      if (refreshingPage) return;
      console.log(
        '[AppRefresh] Event: controllerchange - Neuer SW hat Kontrolle übernommen, Seite wird neu geladen.'
      );
      window.location.reload();
      refreshingPage = true;
    };
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange
    );

    return () => {
      // Cleanup: 'controllerchange'-Listener entfernen
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange
      );
      // Die Listener auf 'registration' und 'installingWorker' sollten automatisch entfernt werden,
      // wenn die Objekte nicht mehr existieren, aber explizites Entfernen wäre hier komplexer.
    };
  }, []);

  /* Online-/Offline-Indikator aktuell halten */
  useEffect(() => {
    const setTrue = () => setOnline(true);
    const setFalse = () => setOnline(false);
    window.addEventListener('online', setTrue);
    window.addEventListener('offline', setFalse);
    return () => {
      window.removeEventListener('online', setTrue);
      window.removeEventListener('offline', setFalse);
    };
  }, []);

  return { refresh, updateAvailable, online } as const;
};
