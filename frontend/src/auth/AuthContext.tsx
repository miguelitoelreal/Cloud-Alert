import { useCallback, useEffect, useMemo, useState } from "react";
import { authService } from "../services/auth";
import { AuthContext, type AuthContextValue } from "./auth-context";
import type {
  AuthSession,
  AuthUser,
  LoginCredentials,
  RegisterPayload,
} from "../types/auth";

type AuthProviderProps = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let active = true;

    const unsubscribe = authService.subscribe((session) => {
      if (!active) {
        return;
      }

      setUser(session?.user ?? null);
    });

    void authService
      .getSession()
      .then((session) => {
        if (!active) {
          return;
        }

        setUser(session?.user ?? null);
      })
      .finally(() => {
        if (active) {
          setIsInitializing(false);
        }
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const setSession = useCallback((session: AuthSession | null) => {
    setUser(session?.user ?? null);
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const session = await authService.login(credentials);
      setSession(session);
    },
    [setSession],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const session = await authService.register(payload);
      setSession(session);
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    await authService.logout();
    setSession(null);
  }, [setSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isInitializing,
      login,
      register,
      logout,
      setSession,
    }),
    [isInitializing, login, logout, register, setSession, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
