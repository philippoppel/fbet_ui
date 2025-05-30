'use client';

import { useEffect, useState, useCallback } from 'react';

export const useAppRefresh = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null
  );
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isRefreshing, setIsRefreshing] = useState(false); // NEU

  const refresh = useCallback(() => {
    console.log('[AppRefresh] refresh() ausgelöst.');
    setIsRefreshing(true); // NEU → Spinner aktivieren
    if (waitingWorker) {
      console.log('[AppRefresh] Sende SKIP_WAITING an wartenden SW.');
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      console.log('[AppRefresh] Kein wartender SW → direkt reload.');
      window.location.reload();
    }
  }, [waitingWorker]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return () => {};

    const swRegistrationPromise = navigator.serviceWorker.ready;

    swRegistrationPromise.then((registration) => {
      if (registration.waiting) {
        console.log('[AppRefresh] Initial: SW wartet bereits.');
        setWaitingWorker(registration.waiting);
        setUpdateAvailable(true);
      }

      registration.addEventListener('updatefound', () => {
        console.log('[AppRefresh] updatefound - neuer SW wird installiert.');
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.addEventListener('statechange', () => {
            console.log(
              `[AppRefresh] Neuer SW Status: ${installingWorker.state}`
            );
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log(
                  '[AppRefresh] Neuer SW installiert, Update verfügbar.'
                );
                setWaitingWorker(registration.waiting || installingWorker);
                setUpdateAvailable(true);
              } else {
                console.log(
                  '[AppRefresh] Neuer SW installiert, erste Aktivierung.'
                );
              }
            }
          });
        }
      });
    });

    let refreshingPage = false;
    const handleControllerChange = () => {
      if (refreshingPage) return;
      console.log('[AppRefresh] controllerchange → reload.');
      refreshingPage = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange
    );

    return () => {
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange
      );
    };
  }, []);

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

  return { refresh, updateAvailable, online, isRefreshing } as const; // NEU: isRefreshing mit zurückgeben
};
