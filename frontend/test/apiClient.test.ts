import { beforeEach, describe, expect, it, vi } from "vitest";
import { authSession } from "./authTestData";
import { setStoredAuthSession, getStoredAuthSession } from "../src/services/authStorage";

const handlers = {
  requestFulfilled: null as ((config: RequestConfig) => RequestConfig) | null,
  responseRejected: null as ((error: unknown) => Promise<unknown>) | null,
};

type RequestConfig = {
  url?: string;
  headers?: Record<string, string>;
  _retry?: boolean;
};

const apiClientMock = vi.fn(async (config: RequestConfig) => ({ data: config }));
Object.assign(apiClientMock, {
  interceptors: {
    request: {
      use: vi.fn((fulfilled: typeof handlers.requestFulfilled) => {
        handlers.requestFulfilled = fulfilled;
      }),
    },
    response: {
      use: vi.fn((_: unknown, rejected: typeof handlers.responseRejected) => {
        handlers.responseRejected = rejected;
      }),
    },
  },
});

const authHttpClientMock = {
  post: vi.fn(),
};

vi.mock("axios", () => ({
  default: {
    create: vi.fn((config: unknown) => {
      if (config && typeof config === "object" && "baseURL" in config) {
        return apiClientMock;
      }

      return apiClientMock;
    }),
    isAxiosError: vi.fn((error: unknown) => Boolean(error && typeof error === "object" && "isAxiosError" in error)),
  },
}));

vi.mock("../src/services/authHttpClient", () => ({
  authHttpClient: authHttpClientMock,
}));

describe("apiClient JWT interceptors", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    handlers.requestFulfilled = null;
    handlers.responseRejected = null;
    vi.resetModules();
    await import("../src/services/apiClient");
  });

  it("agrega Authorization Bearer desde la sesión almacenada", () => {
    setStoredAuthSession(authSession);

    const config = handlers.requestFulfilled?.({ url: "/api/monitors" });

    expect(config?.headers?.Authorization).toBe(`Bearer ${authSession.accessToken}`);
  });

  it("refresca una sola vez ante 401 concurrentes y reintenta con el nuevo access token", async () => {
    const refreshedSession = {
      ...authSession,
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
    };
    setStoredAuthSession(authSession);
    authHttpClientMock.post.mockResolvedValue({ data: refreshedSession });

    const errorA = {
      isAxiosError: true,
      response: { status: 401, data: { detail: "expired" } },
      config: { url: "/api/monitors", headers: {} },
      message: "Request failed",
    };
    const errorB = {
      isAxiosError: true,
      response: { status: 401, data: { detail: "expired" } },
      config: { url: "/api/dashboard/monitors", headers: {} },
      message: "Request failed",
    };

    await Promise.all([
      handlers.responseRejected?.(errorA),
      handlers.responseRejected?.(errorB),
    ]);

    expect(authHttpClientMock.post).toHaveBeenCalledTimes(1);
    expect(authHttpClientMock.post).toHaveBeenCalledWith("/api/auth/refresh", {
      refreshToken: authSession.refreshToken,
    });
    expect(apiClientMock).toHaveBeenCalledTimes(2);
    expect(apiClientMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer new-access-token" }),
      }),
    );
    expect(getStoredAuthSession()).toEqual(refreshedSession);
  });

  it("no intenta refresh para endpoints auth y limpia sesión cuando refresh falla", async () => {
    setStoredAuthSession(authSession);
    authHttpClientMock.post.mockRejectedValue(new Error("invalid refresh"));

    await expect(
      handlers.responseRejected?.({
        isAxiosError: true,
        response: { status: 401, data: { detail: "invalid" } },
        config: { url: "/api/auth/me", headers: {} },
        message: "Request failed",
      }),
    ).rejects.toThrow("invalid");

    expect(authHttpClientMock.post).not.toHaveBeenCalled();

    await expect(
      handlers.responseRejected?.({
        isAxiosError: true,
        response: { status: 401, data: { detail: "expired" } },
        config: { url: "/api/monitors", headers: {} },
        message: "Request failed",
      }),
    ).rejects.toThrow("expired");

    expect(authHttpClientMock.post).toHaveBeenCalledTimes(1);
    expect(getStoredAuthSession()).toBeNull();
  });
});
