// src/app/hooks/usePushNotifications.ts
import { useState, useEffect, useCallback } from 'react';

// Stelle sicher, dass dein VAPID Public Key als Umgebungsvariable verfügbar ist
// und mit NEXT_PUBLIC_ beginnt, damit er im Client-Bundle enthalten ist.
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export enum PushNotificationStatus {
  LOADING = 'loading',
  SUPPORTED_SUBSCRIBED = 'supported_subscribed', // Push unterstützt & Nutzer ist abonniert
  SUPPORTED_NOT_SUBSCRIBED = 'supported_not_subscribed', // Push unterstützt & Nutzer ist NICHT abonniert (oder Erlaubnis fehlt)
  NOT_SUPPORTED = 'not_supported', // Push API nicht im Browser verfügbar
  PERMISSION_DENIED = 'permission_denied', // Nutzer hat Erlaubnis verweigert
  ERROR = 'error',
}

export function usePushNotifications() {
  const [status, setStatus] = useState<PushNotificationStatus>(
    PushNotificationStatus.LOADING
  );
  const [error, setError] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] =
    useState<PushSubscription | null>(null);

  const isPushApiSupported = useCallback(() => {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }, []);

  // Funktion, um den aktuellen Status (inkl. Subscription) zu prüfen und zu setzen
  const checkSubscriptionStatus = useCallback(async () => {
    if (!isPushApiSupported()) {
      setStatus(PushNotificationStatus.NOT_SUPPORTED);
      return;
    }
    setStatus(PushNotificationStatus.LOADING);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setCurrentSubscription(sub);

      if (sub) {
        setStatus(PushNotificationStatus.SUPPORTED_SUBSCRIBED);
      } else {
        if (Notification.permission === 'denied') {
          setStatus(PushNotificationStatus.PERMISSION_DENIED);
        } else {
          setStatus(PushNotificationStatus.SUPPORTED_NOT_SUBSCRIBED);
        }
      }
    } catch (err: any) {
      console.error(
        '[usePushNotifications] Error checking subscription status:',
        err
      );
      setError(err.message || 'Fehler beim Prüfen des Abonnementstatus.');
      setStatus(PushNotificationStatus.ERROR);
    }
  }, [isPushApiSupported]);

  useEffect(() => {
    checkSubscriptionStatus();
  }, [checkSubscriptionStatus]);

  const requestPermissionAndSubscribe =
    useCallback(async (): Promise<boolean> => {
      if (!isPushApiSupported()) {
        setStatus(PushNotificationStatus.NOT_SUPPORTED);
        setError(
          'Push-Benachrichtigungen werden von diesem Browser nicht unterstützt.'
        );
        return false;
      }
      if (!VAPID_PUBLIC_KEY) {
        console.error('[usePushNotifications] VAPID_PUBLIC_KEY nicht gesetzt.');
        setError(
          'Fehler bei der Konfiguration der Push-Benachrichtigungen (Admin Info: VAPID Key fehlt).'
        );
        setStatus(PushNotificationStatus.ERROR);
        return false;
      }

      setStatus(PushNotificationStatus.LOADING);
      try {
        // 1. Erlaubnis anfordern
        const permission = await Notification.requestPermission();
        if (permission === 'denied') {
          setStatus(PushNotificationStatus.PERMISSION_DENIED);
          setError('Erlaubnis für Benachrichtigungen wurde verweigert.');
          return false;
        }
        if (permission === 'default') {
          // Nutzer hat das Dialogfeld geschlossen ohne eine Auswahl zu treffen
          setStatus(PushNotificationStatus.SUPPORTED_NOT_SUBSCRIBED);
          setError('Keine Erlaubnis für Benachrichtigungen erteilt.');
          return false;
        }

        // 2. Service Worker Registrierung abwarten (sollte durch Layout schon erfolgt sein)
        const registration = await navigator.serviceWorker.ready;

        // 3. Push Manager abonnieren
        console.log(
          '[usePushNotifications] Versuche zu subscriben mit VAPID Key:',
          VAPID_PUBLIC_KEY.substring(0, 10) + '...'
        );
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true, // Erforderlich, bedeutet, dass jede Push-Nachricht eine sichtbare Benachrichtigung auslöst
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
        console.log(
          '[usePushNotifications] Erfolgreich subscribed beim Push Manager:',
          subscription
        );

        // 4. Subscription an Backend senden
        const token = localStorage.getItem('fbet_token'); // Dein Auth-Token
        const response = await fetch('/api/push/subscribe', {
          method: 'POST',
          body: JSON.stringify(subscription),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`, // Wichtig für die User-Zuordnung im Backend
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: 'Failed to send subscription to backend, unknown error.',
          }));
          throw new Error(
            errorData.error || `Server error: ${response.status}`
          );
        }

        console.log(
          '[usePushNotifications] Subscription erfolgreich an Backend gesendet.'
        );
        setCurrentSubscription(subscription);
        setStatus(PushNotificationStatus.SUPPORTED_SUBSCRIBED);
        setError(null);
        return true;
      } catch (err: any) {
        console.error(
          '[usePushNotifications] Fehler beim Anfordern der Erlaubnis oder Subscriben:',
          err
        );
        setError(
          err.message ||
            'Unbekannter Fehler beim Aktivieren der Benachrichtigungen.'
        );
        // Status basierend auf Fehler aktualisieren
        if (
          err.message.includes('Permission denied') ||
          err.name === 'NotAllowedError'
        ) {
          setStatus(PushNotificationStatus.PERMISSION_DENIED);
        } else {
          await checkSubscriptionStatus(); // Erneut prüfen, um den korrekten "not subscribed" Status zu setzen
        }
        return false;
      }
    }, [isPushApiSupported, checkSubscriptionStatus]);

  const unsubscribeUser = useCallback(async (): Promise<boolean> => {
    if (!isPushApiSupported() || !currentSubscription) {
      setError(
        currentSubscription
          ? 'Push API nicht unterstützt.'
          : 'Kein aktives Abonnement zum Kündigen vorhanden.'
      );
      return false;
    }

    setStatus(PushNotificationStatus.LOADING);
    try {
      // 1. Vom Push Manager des Browsers de-subscriben
      const unsubscribedSuccessfully = await currentSubscription.unsubscribe();
      if (!unsubscribedSuccessfully) {
        // Sollte selten passieren, aber zur Sicherheit
        throw new Error(
          'Fehler beim De-Subscriben vom Push Manager des Browsers.'
        );
      }
      console.log(
        '[usePushNotifications] Erfolgreich de-subscribed vom Push Manager.'
      );

      // 2. Info an Backend senden, um Subscription zu löschen
      const token = localStorage.getItem('fbet_token');
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ endpoint: currentSubscription.endpoint }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: 'Failed to send unsubscribe to backend, unknown error.',
        }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      console.log(
        '[usePushNotifications] Unsubscribe-Info erfolgreich an Backend gesendet.'
      );
      setCurrentSubscription(null);
      setStatus(PushNotificationStatus.SUPPORTED_NOT_SUBSCRIBED);
      setError(null);
      return true;
    } catch (err: any) {
      console.error('[usePushNotifications] Fehler beim Unsubscriben:', err);
      setError(
        err.message ||
          'Unbekannter Fehler beim Deaktivieren der Benachrichtigungen.'
      );
      await checkSubscriptionStatus(); // Status neu prüfen, um Konsistenz sicherzustellen
      return false;
    }
  }, [isPushApiSupported, currentSubscription, checkSubscriptionStatus]);

  return {
    status,
    error,
    requestPermissionAndSubscribe,
    unsubscribeUser,
    checkSubscriptionStatus, // Um manuell den Status neu zu laden, falls nötig
    isSubscribed: status === PushNotificationStatus.SUPPORTED_SUBSCRIBED, // Bequemer Helfer
    canSubscribe: status === PushNotificationStatus.SUPPORTED_NOT_SUBSCRIBED, // Bequemer Helfer
    permissionDenied: status === PushNotificationStatus.PERMISSION_DENIED, // Bequemer Helfer
    isLoading: status === PushNotificationStatus.LOADING, // Bequemer Helfer
  };
}
