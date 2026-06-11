import { createContext } from "react";
import type {
  AuthSession,
  AuthUser,
  LoginCredentials,
  RegisterPayload,
} from "../types/auth";

export type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  setSession: (session: AuthSession | null) => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
