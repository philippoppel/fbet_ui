'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * Hook: provides a universal refresh() function, SW‑update badge and online status.
 */
export const useAppRefresh = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  /** Force‑reload, and if a waiting Service‑Worker exists activate it first. */
  const refresh = useCallback(() => {
    if (navigator?.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  }, []);

  /* Detect new Service‑Worker installation */
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) setUpdateAvailable(true);

      registration.addEventListener('updatefound', () => {
        const sw = registration.installing;
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
          }
        });
      });
    });
  }, []);

  /* Keep online / offline indicator up‑to‑date */
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
