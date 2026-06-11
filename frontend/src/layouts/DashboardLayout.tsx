import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SidebarNav } from "../components/SidebarNav";
import { Topbar } from "../components/Topbar";

export function DashboardLayout() {
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const title = location.pathname.startsWith("/monitors/")
    ? "Monitor"
    : location.pathname.startsWith("/centro-estado-cloud")
      ? "Centro de Estado Cloud"
      : location.pathname.startsWith("/cloud-status/analytics")
        ? "Analítica Cloud"
        : location.pathname.startsWith("/cloud-status/")
          ? "Proveedor Cloud"
          : location.pathname.startsWith("/noc")
            ? "Panel NOC"
            : location.pathname.startsWith("/alert-subscriptions")
              ? "Suscripciones de Alerta"
              : location.pathname.startsWith("/sla-dashboard")
                ? "Dashboard de SLA"
                : location.pathname.startsWith("/system-health")
                  ? "Salud del Sistema"
                  : location.pathname.startsWith("/clientes")
                    ? "Cartera de Clientes"
                    : location.pathname.startsWith("/configuracion")
                      ? "Configuración"
                      : location.pathname.startsWith("/admin")
                        ? "Administración"
                        : "Centro de Monitoreo";

  return (
    <div className="flex min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <SidebarNav
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((s) => !s)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={title}
          onMenuClick={() => setMobileSidebarOpen((s) => !s)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
