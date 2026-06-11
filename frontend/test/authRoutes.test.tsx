import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "../src/routes/ProtectedRoute";
import { PublicOnlyRoute } from "../src/routes/PublicOnlyRoute";
import { useAuth } from "../src/hooks/useAuth";

vi.mock("../src/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

describe("auth route guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ProtectedRoute muestra loader durante inicialización", () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      isInitializing: true,
      user: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      setSession: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Centro de Monitoreo privado</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  it("ProtectedRoute redirige anónimos a login", () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      isInitializing: false,
      user: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      setSession: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/centro-estado-cloud"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/centro-estado-cloud" element={<div>Centro privado</div>} />
          </Route>
          <Route path="/login" element={<div>Login público</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login público")).toBeInTheDocument();
    expect(screen.queryByText("Centro privado")).not.toBeInTheDocument();
  });

  it("ProtectedRoute permite acceso autenticado", () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      isInitializing: false,
      user: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      setSession: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Centro de Monitoreo privado</div>} />
          </Route>
          <Route path="/login" element={<div>Login público</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Centro de Monitoreo privado")).toBeInTheDocument();
  });

  it("PublicOnlyRoute redirige autenticados al dashboard", () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      isInitializing: false,
      user: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      setSession: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<div>Login público</div>} />
          </Route>
          <Route path="/dashboard" element={<div>Centro de Monitoreo privado</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Centro de Monitoreo privado")).toBeInTheDocument();
    expect(screen.queryByText("Login público")).not.toBeInTheDocument();
  });

  it("PublicOnlyRoute permite login/register a anónimos", () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      isInitializing: false,
      user: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      setSession: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/register" element={<div>Registro público</div>} />
          </Route>
          <Route path="/dashboard" element={<div>Centro de Monitoreo privado</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Registro público")).toBeInTheDocument();
  });
});
