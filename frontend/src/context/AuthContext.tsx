import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '../api';
import { TOKEN_KEY, USER_KEY, setUnauthorizedHandler } from '../api/client';
import type { SessionUser } from '../types';

interface AuthState {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  initialising: boolean;
  login: (username: string, password: string) => Promise<SessionUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function readStoredUser(): SessionUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionUser;
    return parsed && parsed.username ? parsed : null;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [initialising, setInitialising] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const stored = readStoredUser();
    if (!token || !stored) {
      setInitialising(false);
      return;
    }
    authApi
      .me()
      .then(({ data }) => {
        const merged: SessionUser = { ...data, token };
        setUser(merged);
        localStorage.setItem(USER_KEY, JSON.stringify(merged));
      })
      .catch(() => clearSession())
      .finally(() => setInitialising(false));
  }, [clearSession]);

  const login = useCallback(async (username: string, password: string) => {
    const { data } = await authApi.login(username, password);
    const session: SessionUser = { ...data, token: data.token ?? null };
    if (!session.token) throw new Error('The server did not return a session token');
    localStorage.setItem(TOKEN_KEY, session.token);
    localStorage.setItem(USER_KEY, JSON.stringify(session));
    setUser(session);
    return session;
  }, []);

  const logout = useCallback(() => clearSession(), [clearSession]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isAuthenticated: Boolean(user?.token),
      isAdmin: user?.role === 'ADMIN',
      initialising,
      login,
      logout,
    }),
    [user, initialising, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}