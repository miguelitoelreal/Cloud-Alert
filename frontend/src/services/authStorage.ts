import type { AuthSession } from "../types/auth";

const AUTH_SESSION_STORAGE_KEY = "cloud-alert-hub.auth.session";
const listeners = new Set<(session: AuthSession | null) => void>();

function safeParseJson<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isAuthSession(value: unknown): value is AuthSession {
  if (!isRecord(value) || !isRecord(value.user)) {
    return false;
  }

  return (
    isNonEmptyString(value.accessToken) &&
    isNonEmptyString(value.refreshToken) &&
    isNonEmptyString(value.accessTokenExpiresAt) &&
    isNonEmptyString(value.user.id) &&
    isNonEmptyString(value.user.name) &&
    isNonEmptyString(value.user.email) &&
    isNonEmptyString(value.user.createdAt) &&
    Array.isArray(value.user.roles) &&
    value.user.roles.every((role) => typeof role === "string")
  );
}

export function getStoredAuthSession(): AuthSession | null {
  const session = safeParseJson<unknown>(
    localStorage.getItem(AUTH_SESSION_STORAGE_KEY),
    null,
  );

  if (!isAuthSession(session)) {
    localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    return null;
  }

  return session;
}

export function setStoredAuthSession(session: AuthSession | null): void {
  if (!session) {
    localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  } else {
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  listeners.forEach((listener) => listener(session));
}

export function clearStoredAuthSession(): void {
  setStoredAuthSession(null);
}

export function subscribeToAuthSession(
  listener: (session: AuthSession | null) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
