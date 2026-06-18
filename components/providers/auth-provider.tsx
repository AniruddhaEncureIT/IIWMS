"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authService } from "@/services/auth.service";
import type { AuthContextValue, AuthState, LoginCredentials } from "@/types/auth.types";

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true,
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  // Rehydrate from authService — checks token expiry before restoring session
  useEffect(() => {
    const session = authService.getStoredSession();
    if (session) {
      setState({ user: session.user, tokens: session.tokens, isAuthenticated: true, isLoading: false });
    } else {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const { user, tokens } = await authService.login(credentials);
      setState({ user, tokens, isAuthenticated: true, isLoading: false });
    } catch (err) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    await authService.logout().catch(() => undefined);
    setState({ user: null, tokens: null, isAuthenticated: false, isLoading: false });
  }, []);

  const refreshAuth = useCallback(async () => {
    const session = authService.getStoredSession();
    if (session) {
      setState({ user: session.user, tokens: session.tokens, isAuthenticated: true, isLoading: false });
      return;
    }
    const refreshed = await authService.refreshAuth();
    if (refreshed) {
      setState({ user: refreshed.user, tokens: refreshed.tokens, isAuthenticated: true, isLoading: false });
    } else {
      setState({ user: null, tokens: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}
