import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const TOKEN_KEY = 'gdf_token';
const USER_KEY = 'gdf_user';
const CAMP_KEY = 'gdf_camp_id';
const API_BASE_KEY = 'gdf_api_base';

const defaultApiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

type AppState = {
  token: string | null;
  user: string | null;
  campId: string;
  apiBaseUrl: string;
  setToken: (token: string | null) => void;
  setUser: (user: string | null) => void;
  setCampId: (campId: string) => void;
  setApiBaseUrl: (apiBaseUrl: string) => void;
  logout: () => void;
};

const AppStateContext = createContext<AppState | null>(null);

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function useStoredState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readStorage(key, fallback));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (value === null || value === undefined) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  }, [key, value]);

  return [value, setValue] as const;
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useStoredState<string | null>(TOKEN_KEY, null);
  const [user, setUser] = useStoredState<string | null>(USER_KEY, null);
  const [campId, setCampId] = useStoredState<string>(CAMP_KEY, '');
  const [apiBaseUrl, setApiBaseUrl] = useStoredState<string>(API_BASE_KEY, defaultApiBase);

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      campId,
      apiBaseUrl,
      setToken,
      setUser,
      setCampId,
      setApiBaseUrl,
      logout,
    }),
    [token, user, campId, apiBaseUrl],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('AppStateProvider is missing');
  }
  return context;
}
