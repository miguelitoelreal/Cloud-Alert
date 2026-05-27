import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { apiClient } from "../services/apiClient";
import { useSignalRConnection } from "../hooks/useSignalRConnection";

interface HealthDto {
  signalRState: string;
  lastCloudIngestionAt: string | null;
  failedProviders: string[];
  failedProviderDetails: { name: string; lastSyncError: string }[];
  activeWorkers: number;
  uptimeMinutes: number;
  totalMonitors: number;
  activeIncidents: number;
  recentAlerts: number;
  recentErrors: { message: string; timestamp: string }[];
  tenantUsers: number;
}

export function SystemHealthPage() {
  const { user } = useAuth();
  const isAdmin = user?.roles.includes("Admin") ?? false;
  const { state: signalrState, lastSync } = useSignalRConnection();
  const [health, setHealth] = useState<HealthDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<HealthDto>("/api/system/health");
      setHealth(res.data);
      setError(null);
    } catch {
      setError("No se pudo cargar el estado del sistema");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 30000);
    return () => clearInterval(t);
  }, []);

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-100">Acceso denegado</h2>
          <p className="mt-2 text-sm text-slate-400">Se requieren privilegios de administrador.</p>
        </div>
      </div>
    );
  }

  const uptimeHours = Math.floor((health?.uptimeMinutes ?? 0) / 60);
  const uptimeMins = (health?.uptimeMinutes ?? 0) % 60;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">System Health</h1>
          <p className="text-sm text-slate-400">Estado interno de la plataforma</p>
        </div>
        <button
          onClick={() => void load()}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
        >
          Refrescar
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-900/30 bg-red-950/40 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <p className="text-xs text-slate-500">SignalR</p>
          <div className="mt-1 flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${signalrState === "connected" ? "bg-emerald-500" : signalrState === "reconnecting" ? "bg-amber-500 animate-pulse" : "bg-red-500"}`} />
            <span className="text-lg font-bold text-slate-100 capitalize">{signalrState}</span>
          </div>
          {lastSync && (
            <p className="mt-1 text-xs text-slate-500">Última sinc. {lastSync.toLocaleTimeString("es-PE")}</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <p className="text-xs text-slate-500">Uptime API</p>
          <p className="mt-1 text-lg font-bold text-slate-100">
            {loading ? "—" : `${uptimeHours}h ${uptimeMins}m`}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <p className="text-xs text-slate-500">Workers activos</p>
          <p className="mt-1 text-lg font-bold text-slate-100">{loading ? "—" : health?.activeWorkers ?? 0}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <p className="text-xs text-slate-500">Última ingestión cloud</p>
          <p className="mt-1 text-lg font-bold text-slate-100">
            {loading ? "—" : health?.lastCloudIngestionAt
              ? new Date(health.lastCloudIngestionAt).toLocaleString("es-PE", { timeZone: "America/Lima" })
              : "Nunca"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <p className="text-xs text-slate-500">Monitores</p>
          <p className="mt-1 text-2xl font-bold text-slate-100">{loading ? "—" : health?.totalMonitors ?? 0}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <p className="text-xs text-slate-500">Incidencias activas</p>
          <p className="mt-1 text-2xl font-bold text-slate-100">{loading ? "—" : health?.activeIncidents ?? 0}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <p className="text-xs text-slate-500">Alertas 24h</p>
          <p className="mt-1 text-2xl font-bold text-slate-100">{loading ? "—" : health?.recentAlerts ?? 0}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <p className="text-xs text-slate-500">Usuarios del tenant</p>
          <p className="mt-1 text-2xl font-bold text-slate-100">{loading ? "—" : health?.tenantUsers ?? 0}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-200">Proveedores con fallos de sincronización</h3>
          {loading ? (
            <div className="space-y-2">
              <div className="h-8 animate-pulse rounded-lg bg-slate-900" />
              <div className="h-8 animate-pulse rounded-lg bg-slate-900" />
            </div>
          ) : health && health.failedProviderDetails.length > 0 ? (
            <div className="space-y-2">
              {health.failedProviderDetails.map((p) => (
                <div key={p.name} className="rounded-lg border border-red-900/20 bg-red-950/20 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-sm font-medium text-red-200">{p.name}</span>
                  </div>
                  <p className="mt-1 pl-4 text-xs text-red-300/70">{p.lastSyncError}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Ningún proveedor reportó fallas recientes.</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-200">Errores recientes (24h)</h3>
          {loading ? (
            <div className="space-y-2">
              <div className="h-8 animate-pulse rounded-lg bg-slate-900" />
              <div className="h-8 animate-pulse rounded-lg bg-slate-900" />
            </div>
          ) : health && health.recentErrors.length > 0 ? (
            <div className="space-y-2">
              {health.recentErrors.map((e, i) => (
                <div key={i} className="rounded-lg border border-amber-900/20 bg-amber-950/20 px-3 py-2">
                  <p className="text-xs font-medium text-amber-200">{e.message}</p>
                  <p className="mt-0.5 text-[11px] text-amber-300/60">
                    {new Date(e.timestamp).toLocaleString("es-PE", { timeZone: "America/Lima" })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Sin errores recientes.</p>
          )}
        </div>
      </div>
    </div>
  );
}
