import { describe, expect, it, vi } from "vitest";
import { authSession } from "./authTestData";
import {
  clearStoredAuthSession,
  getStoredAuthSession,
  setStoredAuthSession,
  subscribeToAuthSession,
} from "../src/services/authStorage";

describe("authStorage", () => {
  it("persiste y restaura la sesión desde localStorage", () => {
    setStoredAuthSession(authSession);

    expect(getStoredAuthSession()).toEqual(authSession);
  });

  it("devuelve null cuando el valor persistido está corrupto", () => {
    localStorage.setItem("cloud-alert-hub.auth.session", "not-json");

    expect(getStoredAuthSession()).toBeNull();
  });

  it("limpia sesiones con estructura inválida", () => {
    localStorage.setItem(
      "cloud-alert-hub.auth.session",
      JSON.stringify({ ...authSession, user: { ...authSession.user, roles: undefined } }),
    );

    expect(getStoredAuthSession()).toBeNull();
    expect(localStorage.getItem("cloud-alert-hub.auth.session")).toBeNull();
  });

  it("notifica cambios al guardar y cerrar sesión", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToAuthSession(listener);

    setStoredAuthSession(authSession);
    clearStoredAuthSession();
    unsubscribe();
    setStoredAuthSession(authSession);

    expect(listener).toHaveBeenNthCalledWith(1, authSession);
    expect(listener).toHaveBeenNthCalledWith(2, null);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
