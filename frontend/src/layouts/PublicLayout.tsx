import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function PublicLayout() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="min-w-0">
            <div className="text-sm font-semibold tracking-wide text-slate-50">
              Cloud Alert Hub
            </div>
            <div className="text-xs text-slate-400">
              Observabilidad y estado cloud en una sola vista
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <a href="#features" className="hover:text-white">
              Funcionalidades
            </a>
            <a href="#providers" className="hover:text-white">
              Providers
            </a>
            <a href="#how-it-works" className="hover:text-white">
              Cómo funciona
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to="/Centro de Monitoreo"
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
              >
                Ir al Centro de Monitoreo
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
                >
                  Iniciar sesión
                </Link>
                <Link
                  to="/register"
                  className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
                >
                  Registrarse
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <Outlet />

      <footer className="border-t border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-semibold text-slate-200">Cloud Alert Hub</div>
            <div className="mt-1">
              Monitoreo uptime, estado cloud, incidentes SaaS y realtime para
              equipos operativos.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/login" className="hover:text-white">
              Iniciar sesión
            </Link>
            <Link to="/register" className="hover:text-white">
              Registrarse
            </Link>
            <Link to="/dashboard" className="hover:text-white">
              Centro de Monitoreo
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
