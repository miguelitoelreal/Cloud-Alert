import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const alertCount = data?.total ?? 0;
  const hasAlerts = alertCount > 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center justify-center rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-100"
        title="Notificaciones"
      >
        <IconBell className="h-5 w-5" />
        {hasAlerts && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {alertCount > 99 ? "99+" : alertCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-4 top-16 z-50 rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notificaciones</h3>
          </div>

          <div className="max-h-80 overflow-y-auto py-1">
            {!data || data.total === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                No hay alertas activas
              </div>
            ) : (
              <>
                {/* Monitores caídos */}
                {data.offlineMonitors.length > 0 && (
                  <div className="px-3 py-2">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-500">
                      <IconMonitor className="h-3.5 w-3.5" />
                      Monitores caídos ({data.offlineMonitors.length})
                    </div>
                    {data.offlineMonitors.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          navigate(`/monitors/${m.id}`);
                          setOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg border border-slate-100 dark:border-slate-800 border-l-4 border-l-red-500 bg-white dark:bg-slate-950 px-3 py-2 text-left text-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60 mb-1.5"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-red-100 dark:bg-red-950/30 text-[10px] font-bold text-red-600 dark:text-red-300">
                          OFF
                        </span>
                        <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{m.name}</span>
                        <IconChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-400" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Incidencias cloud */}
                {data.activeCloudIncidents.length > 0 && (
                  <div className="border-t border-slate-100 dark:border-slate-800 px-3 py-2">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-500">
                      <IconCloud className="h-3.5 w-3.5" />
                      Incidencias cloud ({data.activeCloudIncidents.length})
                    </div>
                    {data.activeCloudIncidents.map((i) => {
                      const severityBorder =
                        i.severity === 4 ? "border-l-red-500" :
                        i.severity === 3 ? "border-l-amber-500" :
                        i.severity === 2 ? "border-l-yellow-500" :
                        "border-l-blue-500";
                      const severityBadge =
                        i.severity === 4 ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" :
                        i.severity === 3 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" :
                        i.severity === 2 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300" :
                        "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
                      const severityLabel =
                        i.severity === 4 ? "Crítica" :
                        i.severity === 3 ? "Mayor" :
                        i.severity === 2 ? "Menor" :
                        "Info";
                      const providerInitial = i.providerName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                      return (
                        <button
                          key={i.id}
                          type="button"
                          onClick={() => {
                            navigate(`/centro-estado-cloud?incidentId=${i.id}`);
                            setOpen(false);
                          }}
                          className={`flex w-full flex-col gap-1 rounded-lg border border-slate-100 dark:border-slate-800 border-l-4 ${severityBorder} bg-white dark:bg-slate-950 px-3 py-2.5 text-left transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60 mb-1.5`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                              {providerInitial}
                            </span>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                              {i.providerName}
                            </span>
                            <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${severityBadge}`}>
                              {severityLabel}
                            </span>
                          </div>
                          <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {i.title}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <span>Ver detalles en el timeline</span>
                            <IconChevronRight className="h-3 w-3" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* SLA breaches */}
                {data.slaBreaches > 0 && (
                  <div className="border-t border-slate-100 dark:border-slate-800 px-3 py-2">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-500">
                      <IconShield className="h-3.5 w-3.5" />
                      SLA incumplidos ({data.slaBreaches})
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigate("/sla-dashboard");
                        setOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg border border-slate-100 dark:border-slate-800 border-l-4 border-l-rose-500 bg-white dark:bg-slate-950 px-3 py-2 text-left text-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-rose-100 dark:bg-rose-950/30 text-[10px] font-bold text-rose-600 dark:text-rose-300">
                        SLA
                      </span>
                      <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">Ver reportes de SLA</span>
                      <IconChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-400" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {hasAlerts && (
            <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-2">
              <div className="text-center text-xs text-slate-500 dark:text-slate-600">
                Cada alerta te lleva a su sección
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
