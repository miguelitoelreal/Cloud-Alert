import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../src/auth/auth-context";
import { LoginPage } from "../src/pages/LoginPage";
import { RegisterPage } from "../src/pages/RegisterPage";
import type { AuthContextValue } from "../src/auth/auth-context";

function renderWithAuth(element: React.ReactNode, overrides: Partial<AuthContextValue> = {}) {
  const value: AuthContextValue = {
    user: null,
    isAuthenticated: false,
    isInitializing: false,
    login: vi.fn().mockResolvedValue(undefined),
    register: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    setSession: vi.fn(),
    ...overrides,
  };

  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[{ pathname: "/login", state: { from: { pathname: "/centro-estado-cloud" } } }]}>
        <Routes>
          <Route path="/login" element={element} />
          <Route path="/register" element={element} />
          <Route path="/dashboard" element={<div>Centro de Monitoreo privado</div>} />
          <Route path="/centro-estado-cloud" element={<div>Centro privado</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  return value;
}

describe("auth pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("LoginPage valida campos antes de llamar login", async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockResolvedValue(undefined);
    renderWithAuth(<LoginPage />, { login });

    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByText("El correo es obligatorio.")).toBeInTheDocument();
    expect(screen.getByText("La contraseña es obligatoria.")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("LoginPage inicia sesión y vuelve a la ruta protegida solicitada", async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockResolvedValue(undefined);
    renderWithAuth(<LoginPage />, { login });

    await user.type(screen.getByLabelText("Correo electrónico"), " equipo@empresa.com ");
    await user.type(screen.getByLabelText("Contraseña"), "password123");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        email: "equipo@empresa.com",
        password: "password123",
      });
    });
    expect(await screen.findByText("Centro privado")).toBeInTheDocument();
  });

  it("RegisterPage valida confirmación de contraseña", async () => {
    const user = userEvent.setup();
    const register = vi.fn().mockResolvedValue(undefined);
    renderWithAuth(<RegisterPage />, { register });

    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    expect(await screen.findByText("El nombre es obligatorio.")).toBeInTheDocument();
    expect(screen.getByText("El correo es obligatorio.")).toBeInTheDocument();
    expect(screen.getByText("La contraseña es obligatoria.")).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it("RegisterPage registra usuario válido y navega al dashboard por defecto", async () => {
    const user = userEvent.setup();
    const register = vi.fn().mockResolvedValue(undefined);

    render(
      <AuthContext.Provider
        value={{
          user: null,
          isAuthenticated: false,
          isInitializing: false,
          login: vi.fn(),
          register,
          logout: vi.fn(),
          setSession: vi.fn(),
        }}
      >
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<div>Centro de Monitoreo privado</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    await user.type(screen.getByLabelText("Nombre"), " Equipo Cloud ");
    await user.type(screen.getByLabelText("Correo electrónico"), " equipo@empresa.com ");
    await user.type(screen.getByLabelText("Contraseña"), "password123");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "password123");
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith({
        name: "Equipo Cloud",
        email: "equipo@empresa.com",
        password: "password123",
      });
    });
    expect(await screen.findByText("Centro de Monitoreo privado")).toBeInTheDocument();
  });
});
