import axios, { type AxiosRequestConfig } from "axios";
import { API_BASE_URL } from "../config/env";
import type { AuthApiResponse, AuthSession } from "../types/auth";
import { authHttpClient } from "./authHttpClient";
import {
  clearStoredAuthSession,
  getStoredAuthSession,
  setStoredAuthSession,
} from "./authStorage";

type ApiErrorPayload = {
  message?: string;
  error?: string;
  title?: string;
  detail?: string;
  errors?: Record<string, string[] | string>;
};

type RetriableRequestConfig = {
  _retry?: boolean;
};

let refreshPromise: Promise<AuthSession | null> | null = null;

function extractApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    const payload = error.response?.data;

    const validationMessages = payload?.errors
      ? Object.values(payload.errors)
          .flatMap((value) => (Array.isArray(value) ? value : [value]))
          .filter(Boolean)
      : [];

    return (
      payload?.message ??
      payload?.error ??
      payload?.detail ??
      payload?.title ??
      validationMessages[0] ??
      error.message ??
      "Unexpected API error"
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected API error";
}

function toSession(response: AuthApiResponse): AuthSession {
  return {
    user: response.user,
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    accessTokenExpiresAt: response.accessTokenExpiresAt,
  };
}

async function refreshAuthSession(): Promise<AuthSession | null> {
  const currentSession = getStoredAuthSession();
  if (!currentSession?.refreshToken) {
    clearStoredAuthSession();
    return null;
  }

  try {
    const response = await authHttpClient.post<AuthApiResponse>(
      "/api/auth/refresh",
      {
        refreshToken: currentSession.refreshToken,
      },
    );

    const nextSession = toSession(response.data);
    setStoredAuthSession(nextSession);
    return nextSession;
  } catch {
    clearStoredAuthSession();
    return null;
  }
}

async function getOrRefreshSession(): Promise<AuthSession | null> {
  if (!refreshPromise) {
    refreshPromise = refreshAuthSession().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const session = getStoredAuthSession();
  if (session?.accessToken) {
    config.headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(new Error(extractApiErrorMessage(error)));
    }

    const originalRequest = error.config as
      | (AxiosRequestConfig & RetriableRequestConfig)
      | undefined;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url ?? "";
    const isAuthEndpoint = requestUrl.includes("/api/auth/");

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      originalRequest._retry = true;
      const refreshedSession = await getOrRefreshSession();

      if (refreshedSession?.accessToken) {
        Object.assign(originalRequest.headers ?? {}, {
          Authorization: `Bearer ${refreshedSession.accessToken}`,
        });
        return apiClient(originalRequest);
      }
    }

    return Promise.reject(new Error(extractApiErrorMessage(error)));
  },
);
