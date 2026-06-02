import { beforeEach, describe, expect, it, vi } from "vitest";
import { authSession } from "./authTestData";
import { apiClient } from "../src/services/apiClient";
import { authService } from "../src/services/auth";
import { authHttpClient } from "../src/services/authHttpClient";
import { getStoredAuthSession, setStoredAuthSession } from "../src/services/authStorage";

vi.mock("../src/services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("../src/services/authHttpClient", () => ({
  authHttpClient: {
    post: vi.fn(),
  },
}));

const mockedApiClient = vi.mocked(apiClient);
const mockedAuthHttpClient = vi.mocked(authHttpClient);

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("login guarda la sesión emitida por la API", async () => {
    mockedAuthHttpClient.post.mockResolvedValueOnce({ data: authSession });

    const session = await authService.login({
      email: "equipo@empresa.com",
      password: "password123",
    });

    expect(mockedAuthHttpClient.post).toHaveBeenCalledWith("/api/auth/login", {
      email: "equipo@empresa.com",
      password: "password123",
    });
    expect(session).toEqual(authSession);
    expect(getStoredAuthSession()).toEqual(authSession);
  });

  it("register guarda la sesión emitida por la API", async () => {
    mockedAuthHttpClient.post.mockResolvedValueOnce({ data: authSession });

    await authService.register({
      name: "Equipo Cloud",
      email: "equipo@empresa.com",
      password: "password123",
    });

    expect(mockedAuthHttpClient.post).toHaveBeenCalledWith("/api/auth/register", {
      name: "Equipo Cloud",
      email: "equipo@empresa.com",
      password: "password123",
    });
    expect(getStoredAuthSession()).toEqual(authSession);
  });

  it("getSession restaura sesión persistida y refresca datos de usuario", async () => {
    setStoredAuthSession(authSession);
    mockedApiClient.get.mockResolvedValueOnce({
      data: { ...authSession.user, name: "Equipo actualizado" },
    });

    const session = await authService.getSession();

    expect(mockedApiClient.get).toHaveBeenCalledWith("/api/auth/me");
    expect(session?.user.name).toBe("Equipo actualizado");
    expect(getStoredAuthSession()?.user.name).toBe("Equipo actualizado");
  });

  it("getSession limpia persistencia cuando falta token", async () => {
    localStorage.setItem(
      "cloud-alert-hub.auth.session",
      JSON.stringify({ ...authSession, accessToken: "" }),
    );

    await expect(authService.getSession()).resolves.toBeNull();

    expect(getStoredAuthSession()).toBeNull();
    expect(mockedApiClient.get).not.toHaveBeenCalled();
  });

  it("getSession limpia persistencia si /me falla", async () => {
    setStoredAuthSession(authSession);
    mockedApiClient.get.mockRejectedValueOnce(new Error("Unauthorized"));

    await expect(authService.getSession()).resolves.toBeNull();

    expect(getStoredAuthSession()).toBeNull();
  });

  it("logout revoca refresh token y limpia sesión incluso si la API falla", async () => {
    setStoredAuthSession(authSession);
    mockedApiClient.post.mockRejectedValueOnce(new Error("Network error"));

    await expect(authService.logout()).rejects.toThrow("Network error");

    expect(mockedApiClient.post).toHaveBeenCalledWith("/api/auth/logout", {
      refreshToken: authSession.refreshToken,
    });
    expect(getStoredAuthSession()).toBeNull();
  });
});
