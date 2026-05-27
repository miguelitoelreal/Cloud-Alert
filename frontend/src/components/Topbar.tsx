import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button } from "./Button";

function IconMenu(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  );
}
function IconLogOut(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
type TopbarProps = {
  title?: string;
  onMenuClick?: () => void;
};

export function Topbar({ title, onMenuClick }: TopbarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  }

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 px-4 py-3 backdrop-blur-xl md:px-6 md:py-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex items-center justify-center rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-800/80 hover:text-slate-100"
            aria-label="Abrir menú"
          >
            <IconMenu className="h-5 w-5" />
          </button>
          <div>
            <div className="text-sm font-bold tracking-tight text-white">
              Cloud Alert Hub
            </div>
            {title ? (
              <div className="text-xs font-medium text-slate-500">{title}</div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="hidden min-w-0 text-right sm:block">
              <div className="truncate text-sm font-semibold text-slate-200">
                {user.name}
              </div>
              <div className="truncate text-xs text-slate-500">
                {user.email}
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-xs font-bold text-blue-300 ring-1 ring-blue-500/30 sm:flex">
              {initials}
            </div>

            <Button
              variant="secondary"
              onClick={handleLogout}
              isLoading={isLoggingOut}
              className="border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-700/80 hover:text-white"
            >
              <span className="hidden items-center gap-1.5 sm:inline-flex">
                <IconLogOut className="h-4 w-4" />
                Cerrar sesión
              </span>
              <span className="sm:hidden">
                <IconLogOut className="h-4 w-4" />
              </span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
