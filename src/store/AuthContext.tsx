/**
 * AuthContext — manages user session.
 * Token is persisted in localStorage.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchCurrentUser } from '../services/authApi';

export interface User {
  id: number;
  username: string;
  tag: string;
  displayName: string;
  role: string;
  dp: number;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  /** Update user fields without re-login (e.g., DP reconciliation). */
  updateUser: (partial: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'dmc-token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY));

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    fetchCurrentUser(token)
      .then((data) => {
        setUser({
          id: data.id,
          username: data.username,
          tag: data.tag,
          displayName: `${data.username}#${data.tag}`,
          role: data.role,
          dp: data.dp,
        });
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  function login(newToken: string, newUser: User) {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  function updateUser(partial: Partial<User>) {
    setUser((prev) => prev ? { ...prev, ...partial } : prev);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
