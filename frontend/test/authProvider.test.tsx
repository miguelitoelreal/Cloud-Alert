import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authSession } from "./authTestData";
import { AuthProvider } from "../src/auth/AuthContext";
import { authService } from "../src/services/auth";
import { useAuth } from "../src/hooks/useAuth";

vi.mock("../src/services/auth", () => ({
  authService: {
    getSession: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    subscribe: vi.fn(),
  },
}));

const mockedAuthService = vi.mocked(authService);

function Consumer() {
  const { isAuthenticated, isInitializing, user, login, logout } = useAuth();

  return (
    <div>
      <span>{isInitializing ? "initializing" : "ready"}</span>
      <span>{isAuthenticated ? "authenticated" : "anonymous"}</span>
      <span>{user?.email ?? "no-user"}</span>
      <button onClick={() => login({ email: "equipo@empresa.com", password: "password123" })}>
        login
      </button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuthService.subscribe.mockReturnValue(vi.fn());
    mockedAuthService.getSession.mockResolvedValue(null);
    mockedAuthService.login.mockResolvedValue(authSession);
    mockedAuthService.logout.mockResolvedValue();
  });

  it("restaura sesión al inicializar", async () => {
    mockedAuthService.getSession.mockResolvedValueOnce(authSession);

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    expect(screen.getByText("initializing")).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText("ready")).toBeInTheDocument());
    expect(screen.getByText("authenticated")).toBeInTheDocument();
    expect(screen.getByText("equipo@empresa.com")).toBeInTheDocument();
  });

  it("actualiza estado al iniciar sesión y cerrar sesión", async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText("anonymous")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "login" }));
    expect(await screen.findByText("authenticated")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "logout" }));
    expect(await screen.findByText("anonymous")).toBeInTheDocument();
  });

  it("sincroniza cambios emitidos por authStorage", async () => {
    let listener: ((session: typeof authSession | null) => void) | null = null;
    mockedAuthService.subscribe.mockImplementation((nextListener) => {
      listener = nextListener;
      return vi.fn();
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText("anonymous")).toBeInTheDocument());
    act(() => {
      listener?.(authSession);
    });

    expect(await screen.findByText("authenticated")).toBeInTheDocument();
  });
});
