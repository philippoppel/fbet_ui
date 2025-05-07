// src/context/AuthContext.tsx
'use client'; // Wichtig für Context mit Hooks

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { loginUser, getCurrentUser, ApiError } from '@/app/lib/api'; // Importiere API-Funktionen
import { UserOut, Token } from '@/app/lib/types'; // Importiere Typen

interface AuthContextType {
  token: string | null;
  user: UserOut | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserOut | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Startet true für initialen Check
  const [error, setError] = useState<string | null>(null);

  // Funktion zum Laden des Users basierend auf Token
  const fetchUser = useCallback(async (currentToken: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const userData = await getCurrentUser(currentToken);
      setUser(userData);
      setToken(currentToken); // Bestätige Token, wenn User erfolgreich geladen
    } catch (err) {
      console.error('Failed to fetch user', err);
      // Token ist ungültig oder User nicht gefunden -> ausloggen
      setToken(null);
      setUser(null);
      localStorage.removeItem('authToken'); // Token aus Speicher entfernen
      if (err instanceof ApiError) {
        setError(err.detail || err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred while fetching user data.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialer Check beim Laden der App (nur client-seitig)
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      fetchUser(storedToken);
    } else {
      setIsLoading(false); // Kein Token gefunden, Ladevorgang beendet
    }
  }, [fetchUser]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const tokenData: Token = await loginUser(email, password);
      localStorage.setItem('authToken', tokenData.access_token); // Token speichern
      await fetchUser(tokenData.access_token); // User-Daten holen & Zustand setzen
      return true; // Login erfolgreich
    } catch (err) {
      console.error('Login failed', err);
      localStorage.removeItem('authToken'); // Sicherstellen, dass kein alter Token bleibt
      setToken(null);
      setUser(null);
      if (err instanceof ApiError) {
        setError(err.detail || err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred during login.');
      }
      setIsLoading(false);
      return false; // Login fehlgeschlagen
    }
    // setIsLoading wird in fetchUser auf false gesetzt
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setError(null);
    localStorage.removeItem('authToken'); // Token entfernen
    // Optional: Weiterleitung zur Login-Seite (kann auch in der Komponente erfolgen)
    // window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{ token, user, isLoading, error, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook für einfachen Zugriff auf den Context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
