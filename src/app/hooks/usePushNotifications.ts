// src/app/hooks/usePushNotifications.ts
import { useState, useEffect, useCallback } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // ... (Funktion bleibt gleich) ...
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
  // ... (Enum bleibt gleich) ...
  LOADING = 'loading',
  SUPPORTED_SUBSCRIBED = 'supported_subscribed',
  SUPPORTED_NOT_SUBSCRIBED = 'supported_not_subscribed',
  NOT_SUPPORTED = 'not_supported',
  PERMISSION_DENIED = 'permission_denied',
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
    // ... (Funktion bleibt gleich) ...
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }, []);

  const checkSubscriptionStatus = useCallback(async () => {
    // ... (Funktion bleibt gleich) ...
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
      // ... (Logik für Support-Check, VAPID Key, Permission-Request, SW ready, pushManager.subscribe bleibt gleich) ...
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
        const permission = await Notification.requestPermission();
        if (permission === 'denied') {
          setStatus(PushNotificationStatus.PERMISSION_DENIED);
          setError('Erlaubnis für Benachrichtigungen wurde verweigert.');
          return false;
        }
        if (permission === 'default') {
          setStatus(PushNotificationStatus.SUPPORTED_NOT_SUBSCRIBED);
          setError('Keine Erlaubnis für Benachrichtigungen erteilt.');
          return false;
        }

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        // 4. Subscription an Backend senden - OHNE manuellen Authorization Header
        // Der Browser sollte den 'fbet_token' Cookie automatisch mitsenden.
        console.log(
          '[PushHook] Sending subscription to backend (relying on cookie auth)'
        );
        const response = await fetch('/api/push/subscribe', {
          method: 'POST',
          body: JSON.stringify(subscription),
          headers: {
            'Content-Type': 'application/json',
            // KEIN 'Authorization': `Bearer ${token}` Header mehr hier!
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error:
              'Failed to send subscription to backend, unknown server error.',
          }));
          // Spezifische Fehlermeldung für 401, falls es immer noch passiert
          if (response.status === 401) {
            throw new Error(
              errorData.error || 'Nicht autorisiert. Bitte erneut einloggen.'
            );
          }
          throw new Error(
            errorData.error ||
              `Serverfehler beim Speichern der Subscription: ${response.status}`
          );
        }

        console.log(
          '[usePushNotifications] Subscription erfolgreich an Backend gesendet.'
        );
        setCurrentSubscription(subscription);
        setStatus(PushNotificationStatus.SUPPORTED_SUBSCRIBED);
        setError(null);
        try {
          await fetch('/api/push/test', { method: 'POST' });
        } catch (e) {
          console.error('[usePushNotifications] Failed to send test notification:', e);
        }
        return true;
      } catch (err: any) {
        // ... (Fehlerbehandlung bleibt ähnlich) ...
        console.error(
          '[usePushNotifications] Fehler beim Anfordern der Erlaubnis oder Subscriben:',
          err
        );
        setError(
          err.message ||
            'Unbekannter Fehler beim Aktivieren der Benachrichtigungen.'
        );
        if (
          err.message.includes('Permission denied') ||
          err.name === 'NotAllowedError'
        ) {
          setStatus(PushNotificationStatus.PERMISSION_DENIED);
        } else {
          await checkSubscriptionStatus();
        }
        return false;
      }
    }, [isPushApiSupported, checkSubscriptionStatus]);

  const unsubscribeUser = useCallback(async (): Promise<boolean> => {
    // ... (Logik für Support-Check, currentSubscription.unsubscribe() bleibt gleich) ...
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
      const unsubscribedSuccessfully = await currentSubscription.unsubscribe();
      if (!unsubscribedSuccessfully) {
        throw new Error(
          'Fehler beim De-Subscriben vom Push Manager des Browsers.'
        );
      }

      // 2. Info an Backend senden - OHNE manuellen Authorization Header
      console.log(
        '[PushHook] Sending unsubscribe to backend (relying on cookie auth)'
      );
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ endpoint: currentSubscription.endpoint }),
        headers: {
          'Content-Type': 'application/json',
          // KEIN 'Authorization': `Bearer ${token}` Header mehr hier!
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: 'Failed to send unsubscribe to backend, unknown server error.',
        }));
        if (response.status === 401) {
          throw new Error(
            errorData.error || 'Nicht autorisiert. Bitte erneut einloggen.'
          );
        }
        throw new Error(
          errorData.error ||
            `Serverfehler beim Abmelden der Subscription: ${response.status}`
        );
      }

      console.log(
        '[usePushNotifications] Unsubscribe-Info erfolgreich an Backend gesendet.'
      );
      setCurrentSubscription(null);
      setStatus(PushNotificationStatus.SUPPORTED_NOT_SUBSCRIBED);
      setError(null);
      return true;
    } catch (err: any) {
      // ... (Fehlerbehandlung bleibt ähnlich) ...
      console.error('[usePushNotifications] Fehler beim Unsubscriben:', err);
      setError(
        err.message ||
          'Unbekannter Fehler beim Deaktivieren der Benachrichtigungen.'
      );
      await checkSubscriptionStatus();
      return false;
    }
  }, [isPushApiSupported, currentSubscription, checkSubscriptionStatus]);

  const triggerTestNotification = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/push/test', { method: 'POST' });
      return res.ok;
    } catch (e) {
      console.error('[usePushNotifications] Failed to trigger test push:', e);
      return false;
    }
  }, []);

  return {
    // ... (Return-Objekt bleibt gleich) ...
    status,
    error,
    requestPermissionAndSubscribe,
    unsubscribeUser,
    checkSubscriptionStatus,
    triggerTestNotification,
    isSubscribed: status === PushNotificationStatus.SUPPORTED_SUBSCRIBED,
    canSubscribe: status === PushNotificationStatus.SUPPORTED_NOT_SUBSCRIBED,
    permissionDenied: status === PushNotificationStatus.PERMISSION_DENIED,
    isLoading: status === PushNotificationStatus.LOADING,
  };
}
