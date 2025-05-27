// src/app/DEIN_PFAD_ZU/AuthContext.tsx
'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import Cookies from 'js-cookie';
// Stelle sicher, dass ApiError hier korrekt importiert wird, wenn es in loginUser verwendet wird
import { loginUser, getCurrentUser, ApiError } from '@/app/lib/api';
import type { UserOut } from '@/app/lib/types';

interface AuthCtx {
  user: UserOut | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const STORAGE_KEY = 'fbet_token';
const COOKIE_KEY = 'fbet_token';

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserOut | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* 🔐 Load stored token once */
  useEffect(() => {
    console.log(
      '[FRONTEND AuthContext] Initializing: Attempting to load stored token.'
    ); // NEUES LOG
    const stored =
      typeof window !== 'undefined'
        ? localStorage.getItem(STORAGE_KEY) || Cookies.get(COOKIE_KEY)
        : null;
    console.log(
      '[FRONTEND AuthContext] Initial token load - stored value from localStorage/cookie:',
      stored
    ); // NEUES LOG
    if (stored) {
      setToken(stored);
      console.log(
        '[FRONTEND AuthContext] Initial token load - Token set in state from storage.'
      ); // NEUES LOG
    } else {
      console.log(
        '[FRONTEND AuthContext] Initial token load - No token found in storage.'
      ); // NEUES LOG
      setIsLoading(false);
    }
  }, []);

  /* 👤 Fetch current user when token changes */
  useEffect(() => {
    if (!token) {
      console.log(
        '[FRONTEND AuthContext] useEffect(fetchUser): No token in state, skipping getCurrentUser.'
      ); // NEUES LOG
      // Wenn kein Token da ist (z.B. nach flushToken oder initial), sollte isLoading hier auch auf false gesetzt werden,
      // falls es nicht schon durch den initialen Lade-Effekt passiert ist.
      if (isLoading) setIsLoading(false);
      return;
    }
    console.log(
      '[FRONTEND AuthContext] useEffect(fetchUser): Token found in state, attempting getCurrentUser with token:',
      token
    ); // NEUES LOG
    setIsLoading(true); // Setze isLoading true, bevor der Async-Call startet
    (async () => {
      try {
        const me = await getCurrentUser(token);
        setUser(me);
        console.log(
          '[FRONTEND AuthContext] useEffect(fetchUser): getCurrentUser SUCCESS, user set:',
          me
        ); // NEUES LOG
      } catch (err) {
        console.error(
          '[FRONTEND AuthContext] useEffect(fetchUser): getCurrentUser FAILED, calling flushToken. Error:',
          err
        ); // NEUES LOG
        flushToken(); // Bei Fehler hier Token löschen
      } finally {
        setIsLoading(false);
      }
    })();
  }, [token]); // Abhängigkeit von token ist korrekt

  const persistToken = (tok: string) => {
    console.log('[FRONTEND AuthContext] persistToken CALLED with token:', tok); // NEUES LOG
    if (typeof tok !== 'string' || !tok) {
      console.error(
        '[FRONTEND AuthContext] persistToken CALLED with INVALID token:',
        tok
      ); // NEUES LOG für ungültigen Token
      return; // Verhindere das Speichern von 'undefined' oder leeren Strings als gültige Tokens
    }
    localStorage.setItem(STORAGE_KEY, tok);
    Cookies.set(COOKIE_KEY, tok, { expires: 7 });
    console.log(
      '[FRONTEND AuthContext] persistToken: Token set in localStorage and cookies.'
    ); // NEUES LOG
  };

  const flushToken = () => {
    console.log('[FRONTEND AuthContext] flushToken CALLED'); // NEUES LOG
    setUser(null);
    setToken(null); // Löst das useEffect(fetchUser) aus, das dann nichts tut
    localStorage.removeItem(STORAGE_KEY);
    Cookies.remove(COOKIE_KEY);
    console.log(
      '[FRONTEND AuthContext] flushToken: Token removed from state, localStorage, and cookies.'
    ); // NEUES LOG
  };

  /* 🔑 login */
  const login = useCallback(async (email: string, password: string) => {
    console.log(
      `[FRONTEND AuthContext] login() function CALLED for email: ${email}`
    ); // NEUES LOG
    setIsLoading(true);
    setError(null);
    try {
      // Wichtig: die gesamte Antwort loggen, um zu sehen, ob "access_token" da ist
      const apiResponse = await loginUser(email, password);
      console.log(
        '[FRONTEND AuthContext] loginUser API raw response:',
        apiResponse
      ); // NEUES LOG

      // Überprüfe die Struktur der Antwort, bevor du auf access_token zugreifst
      if (
        apiResponse &&
        typeof apiResponse.access_token === 'string' &&
        apiResponse.access_token
      ) {
        const { access_token } = apiResponse;
        console.log(
          '[FRONTEND AuthContext] loginUser API response CONTAINS access_token:',
          access_token
        ); // NEUES LOG
        persistToken(access_token);
        setToken(access_token); // Dies löst das useEffect für getCurrentUser aus
        // getCurrentUser wird jetzt durch das obige useEffect gehandhabt, sobald token gesetzt ist.
        // Den direkten Aufruf von getCurrentUser und setUser hier können wir entfernen, um Dopplung zu vermeiden
        // und den Flow klarer über das token-useEffect zu steuern.
        // const me = await getCurrentUser(access_token);
        // setUser(me);
        return true;
      } else {
        console.error(
          '[FRONTEND AuthContext] loginUser API response does NOT contain a valid access_token string!',
          apiResponse
        ); // NEUES LOG
        throw new Error(
          'Antwort von loginUser API enthält keinen gültigen access_token oder hat eine unerwartete Struktur.'
        );
      }
    } catch (err) {
      console.error(
        '[FRONTEND AuthContext] login() function FAILED. Error:',
        err
      ); // NEUES LOG
      const msg =
        err instanceof ApiError // Stelle sicher, dass ApiError korrekt importiert und definiert ist
          ? err.detail || err.message
          : err instanceof Error
            ? err.message
            : 'Unbekannter Fehler beim Login';
      setError(msg);
      flushToken(); // Wichtig: Hier wird bei Fehler der Token gelöscht!
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []); // Fehlende Abhängigkeiten im useCallback könnten zu stale Closures führen, aber hier scheint es primär um Funktionen zu gehen.

  /* 🚪 logout */
  const logout = useCallback(() => {
    console.log('[FRONTEND AuthContext] logout() function CALLED'); // NEUES LOG
    flushToken();
  }, []); // flushToken ist stabil, daher leeres dep array ok

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, error, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
};
