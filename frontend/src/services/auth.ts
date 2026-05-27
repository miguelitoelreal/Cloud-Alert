import { apiClient } from "./apiClient";
import { authHttpClient } from "./authHttpClient";
import {
  clearStoredAuthSession,
  getStoredAuthSession,
  setStoredAuthSession,
  subscribeToAuthSession,
} from "./authStorage";
import type {
  AuthApiResponse,
  AuthSession,
  AuthUser,
  ChangePasswordPayload,
  LoginCredentials,
  RegisterPayload,
  UpdateProfilePayload,
} from "../types/auth";

export interface AuthService {
  getSession(): Promise<AuthSession | null>;
  login(credentials: LoginCredentials): Promise<AuthSession>;
  register(payload: RegisterPayload): Promise<AuthSession>;
  logout(): Promise<void>;
  subscribe: (listener: (session: AuthSession | null) => void) => () => void;
}

function toSession(response: AuthApiResponse): AuthSession {
  return {
    user: response.user,
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    accessTokenExpiresAt: response.accessTokenExpiresAt,
  };
}

function mergeUserIntoSession(
  session: AuthSession,
  user: AuthUser,
): AuthSession {
  return {
    ...session,
    user,
  };
}

class ApiAuthService implements AuthService {
  subscribe(listener: (session: AuthSession | null) => void): () => void {
    return subscribeToAuthSession(listener);
  }

  async getSession(): Promise<AuthSession | null> {
    const currentSession = getStoredAuthSession();
    if (!currentSession?.accessToken || !currentSession.refreshToken) {
      clearStoredAuthSession();
      return null;
    }

    try {
      const response = await apiClient.get<AuthUser>("/api/auth/me");
      const nextSession = mergeUserIntoSession(currentSession, response.data);
      setStoredAuthSession(nextSession);
      return nextSession;
    } catch {
      clearStoredAuthSession();
      return null;
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const response = await authHttpClient.post<AuthApiResponse>(
      "/api/auth/login",
      credentials,
    );

    const session = toSession(response.data);
    setStoredAuthSession(session);
    return session;
  }

  async register(payload: RegisterPayload): Promise<AuthSession> {
    const response = await authHttpClient.post<AuthApiResponse>(
      "/api/auth/register",
      payload,
    );

    const session = toSession(response.data);
    setStoredAuthSession(session);
    return session;
  }

  async logout(): Promise<void> {
    const currentSession = getStoredAuthSession();

    try {
      if (currentSession?.accessToken) {
        await apiClient.post("/api/auth/logout", {
          refreshToken: currentSession.refreshToken,
        });
      }
    } finally {
      clearStoredAuthSession();
    }
  }

  async updateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
    const response = await apiClient.put<AuthUser>("/api/auth/me", payload);
    const currentSession = getStoredAuthSession();
    if (currentSession) {
      const nextSession = mergeUserIntoSession(currentSession, response.data);
      setStoredAuthSession(nextSession);
    }
    return response.data;
  }

  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    await apiClient.put("/api/auth/change-password", payload);
  }
}

export const authService = new ApiAuthService();
