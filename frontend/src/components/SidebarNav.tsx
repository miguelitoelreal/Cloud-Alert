import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/* ── inline SVG nav icons ── */
function IconMonitor(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}
function IconCloudStatus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  );
}
function IconPlug(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22v-5M9 8V2M15 8V2M18 8H6a4 4 0 0 0 0 8h12a4 4 0 0 0 0-8z" />
    </svg>
  );
}
function IconSettings(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function IconBriefcase(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  );
}
function IconBell(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
function IconAdmin(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function IconChart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  );
}
function IconBellRing(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      <path d="M4 2C2.8 3.7 2 5.7 2 8" />
      <path d="M22 8c0-2.3-.8-4.3-2-6" />
    </svg>
  );
}
function IconShield(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconMenu(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

type NavItem = {
  to: string;
  label: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Centro de Monitoreo", icon: IconMonitor },
  { to: "/centro-estado-cloud", label: "Centro de Estado Cloud", icon: IconCloudStatus },
  { to: "/cloud-status/analytics", label: "Analítica Cloud", icon: IconChart },
  { to: "/alert-subscriptions", label: "Suscripciones de Alerta", icon: IconBellRing },
  { to: "/sla-dashboard", label: "Dashboard de SLA", icon: IconShield },
  { to: "/clientes", label: "Cartera de Clientes", icon: IconBriefcase },
  { to: "/alertas", label: "Mis Alertas", icon: IconBell },
  { to: "/integraciones", label: "Integraciones", icon: IconPlug },
  { to: "/configuracion", label: "Configuración", icon: IconSettings },
];

type SidebarNavProps = {
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

function IconChevronLeft(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function IconChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function SidebarNav({ isOpen, onClose, collapsed = false, onToggleCollapse }: SidebarNavProps) {
  const { user } = useAuth();
  const isAdmin = user?.roles.includes("Admin") ?? false;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-800 bg-slate-900/95 text-slate-100 transition-all duration-300 ease-out backdrop-blur-xl",
          collapsed ? "w-16 items-center px-2 py-4" : "w-64 p-4",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "md:static md:block md:translate-x-0",
        ].join(" ")}
      >
        {/* Brand / Toggle */}
        <div className={collapsed ? "mb-6 flex flex-col items-center gap-2" : "mb-8 flex items-center justify-between px-2"}>
          {collapsed ? (
            <>
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/25">
                <IconCloudStatus className="h-4 w-4 text-white" />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/25">
                  <IconCloudStatus className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold tracking-tight text-white">Cloud Alert Hub</div>
                  <div className="text-[10px] font-medium uppercase tracking-widest text-slate-500">Observabilidad</div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100 md:hidden"
                aria-label="Cerrar menú"
              >
                <IconMenu className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* Toggle button (desktop only) */}
        {collapsed ? null : (
          <div className="mb-3 hidden px-2 md:block">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
              title="Colapsar menú"
            >
              <IconChevronLeft className="h-4 w-4" />
              <span>Ocultar menú</span>
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className={collapsed ? "flex flex-1 flex-col items-center gap-3 overflow-y-auto py-2" : "space-y-1 flex-1 overflow-y-auto"}>
          {!isAdmin ? (
            <>
              {!collapsed && (
                <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                  Principal
                </div>
              )}
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    [
                      "group flex items-center transition-all duration-200",
                      collapsed
                        ? "justify-center rounded-xl p-2.5"
                        : "gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                      isActive
                        ? collapsed
                          ? "bg-blue-500/10 text-blue-300"
                          : "bg-blue-500/10 text-blue-300 shadow-sm shadow-blue-500/10"
                        : collapsed
                          ? "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200",
                    ].join(" ")
                  }
                >
                  {({ isActive }) => (
                    <>
                      {collapsed ? (
                        <span title={item.label}>
                          <item.icon
                            className={`h-5 w-5 shrink-0 transition-colors ${
                              isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                            }`}
                          />
                        </span>
                      ) : (
                        <item.icon
                          className={`h-5 w-5 shrink-0 transition-colors ${
                            isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                          }`}
                        />
                      )}
                      {!collapsed && <span>{item.label}</span>}
                      {!collapsed && isActive && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400 shadow-sm shadow-blue-400/50" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </>
          ) : null}

          {isAdmin ? (
            <>
              {!collapsed && (
                <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                  Administración
                </div>
              )}
              <NavLink
                to="/admin"
                onClick={onClose}
                className={({ isActive }) =>
                  [
                    "group flex items-center transition-all duration-200",
                    collapsed
                      ? "justify-center rounded-xl p-2.5"
                      : "gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                    isActive
                      ? collapsed
                        ? "bg-amber-500/10 text-amber-300"
                        : "bg-amber-500/10 text-amber-300 shadow-sm shadow-amber-500/10"
                      : collapsed
                        ? "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <>
                    {collapsed ? (
                      <span title="Administración">
                        <IconAdmin
                          className={`h-5 w-5 shrink-0 transition-colors ${
                            isActive ? "text-amber-400" : "text-slate-500 group-hover:text-slate-300"
                          }`}
                        />
                      </span>
                    ) : (
                      <IconAdmin
                        className={`h-5 w-5 shrink-0 transition-colors ${
                          isActive ? "text-amber-400" : "text-slate-500 group-hover:text-slate-300"
                        }`}
                      />
                    )}
                    {!collapsed && <span>Administración</span>}
                    {!collapsed && isActive && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
                    )}
                  </>
                )}
              </NavLink>
              <NavLink
                to="/system-health"
                onClick={onClose}
                className={({ isActive }) =>
                  [
                    "group flex items-center transition-all duration-200",
                    collapsed
                      ? "justify-center rounded-xl p-2.5"
                      : "gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                    isActive
                      ? collapsed
                        ? "bg-emerald-500/10 text-emerald-300"
                        : "bg-emerald-500/10 text-emerald-300 shadow-sm shadow-emerald-500/10"
                      : collapsed
                        ? "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <>
                    {collapsed ? (
                      <span title="Salud del Sistema">
                        <IconMonitor
                          className={`h-5 w-5 shrink-0 transition-colors ${
                            isActive ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300"
                          }`}
                        />
                      </span>
                    ) : (
                      <IconMonitor
                        className={`h-5 w-5 shrink-0 transition-colors ${
                          isActive ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300"
                        }`}
                      />
                    )}
                    {!collapsed && <span>Salud del Sistema</span>}
                    {!collapsed && isActive && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                    )}
                  </>
                )}
              </NavLink>
            </>
          ) : null}

          {/* Toggle button when collapsed */}
          {collapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="mt-auto flex items-center justify-center rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-slate-800/60 hover:text-slate-200"
              title="Expandir menú"
            >
              <IconChevronRight className="h-5 w-5" />
            </button>
          )}
        </nav>

        {/* Bottom hint */}
        {collapsed ? null : (
          <div className="mt-auto pt-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                <span className="text-xs font-medium text-slate-400">Sistema operativo</span>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
