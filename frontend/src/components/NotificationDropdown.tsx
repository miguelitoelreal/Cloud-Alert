import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../services/apiClient";
import type { AlertsSummary } from "../services/alertsSummary";

function IconBell(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function IconMonitor(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function IconCloud(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
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

function IconChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

type NotificationDropdownProps = {
  data: AlertsSummary | null;
};

export function NotificationDropdown({ data }: NotificationDropdownProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Load unread count on mount and periodically
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const response = await apiClient.get("/api/notifications/unread-count");
        setUnreadCount(response.data.count);
      } catch (e) {
        console.error("Failed to load unread count:", e);
      }
    };
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const alertCount = unreadCount;
  const hasAlerts = alertCount > 0;

  const handleItemClick = async (navigateTo: string) => {
    try {
      await apiClient.post("/api/notifications/mark-all-read");
      setUnreadCount(0);
    } catch (e) {
      console.error("Failed to mark as read:", e);
    }
    navigate(navigateTo);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center justify-center rounded-full p-2.5 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-100"
        title="Notificaciones"
      >
        <IconBell className="h-5 w-5" />
        {hasAlerts && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white shadow-lg">
            {alertCount > 99 ? "99+" : alertCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Overlay en móvil */}
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm sm:hidden" onClick={() => setOpen(false)} />

          <div className="fixed inset-x-2 top-16 z-50 max-h-[calc(100vh-5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 sm:max-h-[500px]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notificaciones</h3>
            </div>

            {/* Content */}
            <div className="max-h-[calc(100vh-8rem)] overflow-y-auto sm:max-h-[400px]">
              {!data || data.total === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                  <div className="mb-3 rounded-full bg-slate-100 p-3 dark:bg-slate-800">
                    <IconBell className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No hay alertas activas</p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Todo está funcionando correctamente</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {/* Monitores caídos */}
                  {data.offlineMonitors.length > 0 && (
                    <div className="px-2 py-2">
                      <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
                        <IconMonitor className="h-3.5 w-3.5" />
                        Monitores caídos ({data.offlineMonitors.length})
                      </div>
                      {data.offlineMonitors.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleItemClick(`/monitors/${m.id}`)}
                          className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition-all hover:border-red-300 hover:bg-red-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-red-900/50 dark:hover:bg-red-950/20 mb-2"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/30">
                            <IconMonitor className="h-5 w-5 text-red-600 dark:text-red-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{m.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Monitor offline</p>
                          </div>
                          <IconChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Incidencias cloud */}
                  {data.activeCloudIncidents.length > 0 && (
                    <div className="px-2 py-2">
                      <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        <IconCloud className="h-3.5 w-3.5" />
                        Incidencias cloud ({data.activeCloudIncidents.length})
                      </div>
                      {data.activeCloudIncidents.map((i) => {
                        const severityColor =
                          i.severity === 4 ? "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-950/30" :
                          i.severity === 3 ? "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950/30" :
                          i.severity === 2 ? "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-950/30" :
                          "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-950/30";
                        const severityLabel =
                          i.severity === 4 ? "Crítica" :
                          i.severity === 3 ? "Mayor" :
                          i.severity === 2 ? "Menor" :
                          "Info";
                        return (
                          <button
                            key={i.id}
                            type="button"
                            onClick={() => handleItemClick(`/centro-estado-cloud?incidentId=${i.id}`)}
                            className="flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition-all hover:border-amber-300 hover:bg-amber-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-amber-900/50 dark:hover:bg-amber-950/20 mb-2"
                          >
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${severityColor}`}>
                              <IconCloud className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{i.providerName}</p>
                              <p className="mt-0.5 truncate text-sm font-semibold text-slate-900 dark:text-white">{i.title}</p>
                              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${severityColor}`}>
                                {severityLabel}
                              </span>
                            </div>
                            <IconChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* SLA breaches */}
                  {data.slaBreaches > 0 && (
                    <div className="px-2 py-2">
                      <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                        <IconShield className="h-3.5 w-3.5" />
                        SLA incumplidos ({data.slaBreaches})
                      </div>
                      <button
                        type="button"
                        onClick={() => handleItemClick("/sla-dashboard")}
                        className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition-all hover:border-rose-300 hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-rose-900/50 dark:hover:bg-rose-950/20"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/30">
                          <IconShield className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">Ver reportes de SLA</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{data.slaBreaches} incumplimiento(s)</p>
                        </div>
                        <IconChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
