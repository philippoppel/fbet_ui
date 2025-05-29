'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import Cookies from 'js-cookie';
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
  const [hasTriedTokenLoad, setHasTriedTokenLoad] = useState(false);

  const persistToken = useCallback((tok: string) => {
    localStorage.setItem(STORAGE_KEY, tok);
    Cookies.set(COOKIE_KEY, tok, {
      expires: 365,
      sameSite: 'Lax',
      secure: true,
    });
  }, []);

  const flushToken = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
    Cookies.remove(COOKIE_KEY);
  }, []);

  // Token aus localStorage oder Cookies laden
  useEffect(() => {
    const stored =
      typeof window !== 'undefined'
        ? localStorage.getItem(STORAGE_KEY) || Cookies.get(COOKIE_KEY)
        : null;
    if (stored) {
      setToken(stored);
    }
    setHasTriedTokenLoad(true);
  }, []);

  // Userdaten laden, sobald Token vorhanden
  useEffect(() => {
    if (!token) {
      if (hasTriedTokenLoad) {
        setIsLoading(false);
      }
      return;
    }

    const fetchUser = async () => {
      try {
        const me = await getCurrentUser(token);
        setUser(me);
      } catch (err) {
        console.error('[Auth] getCurrentUser failed', err);
        flushToken();
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [token, hasTriedTokenLoad, flushToken]);

  // Login
  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const { access_token } = await loginUser(email, password);
        persistToken(access_token);
        setToken(access_token); // Triggert automatisch das Laden von `me`
        return true;
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.detail || err.message
            : 'Unbekannter Fehler';
        setError(msg);
        flushToken();
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [persistToken, flushToken]
  );

  // Logout
  const logout = useCallback(() => {
    flushToken();
  }, [flushToken]);

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
