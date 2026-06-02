import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../services/apiClient";
import { createMonitoringConnection } from "../services/signalr";
import { useAuth } from "../hooks/useAuth";
import type { HubConnection } from "@microsoft/signalr";

interface NocIncident {
  id: string;
  title: string;
  severity: number;
  providerName: string;
  occurredAt: string;
  status: string;
}

function severityColor(s: number): string {
  const map: Record<number, string> = { 0: "#3b82f6", 1: "#eab308", 2: "#f97316", 3: "#ef4444" };
  return map[s] ?? "#9ca3af";
}

function severityLabel(s: number): string {
  const map: Record<number, string> = { 0: "Info", 1: "Menor", 2: "Mayor", 3: "Crítico" };
  return map[s] ?? "Desconocido";
}

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-right">
      <div className="text-3xl font-bold text-white">{time.toISOString().slice(11, 19)}</div>
      <div className="text-sm text-gray-400">UTC</div>
    </div>
  );
}

export function NocWallboardPage() {
  const { user } = useAuth();
  const canAccessNoc = Boolean(user);

  const [incidents, setIncidents] = useState<NocIncident[]>([]);
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [overallUptime, setOverallUptime] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const loadIncidents = async () => {
    try {
      const res = await apiClient.get<{ incidents: NocIncident[] }>("/api/cloud-status/overview", {
        params: { activeOnly: true, take: 50 },
      });
      setIncidents(res.data.incidents ?? []);
      setLastUpdate(new Date());
    } catch {
      // keep existing
    }
  };

  const loadHealth = async () => {
    try {
      const res = await apiClient.get<{ score: number }>("/api/cloud-status/health-score");
      setHealthScore(res.data.score);
    } catch {
      // keep existing
    }
  };

  const loadAnalytics = async () => {
    try {
      const res = await apiClient.get<{ uptimePercent: number }[]>("/api/cloud-status/analytics");
      if (res.data.length > 0) {
        const avg = res.data.reduce((a, b) => a + b.uptimePercent, 0) / res.data.length;
        setOverallUptime(Math.round(avg * 100) / 100);
      }
    } catch {
      // keep existing
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadIncidents(), loadHealth(), loadAnalytics()]);
    setLoading(false);
  };

  useEffect(() => {
    void loadAll();
    const interval = setInterval(() => void loadAll(), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const connection: HubConnection = createMonitoringConnection();
    connection.on("IncidentCreated", () => {
      void loadIncidents();
      void loadHealth();
      setLastUpdate(new Date());
    });
    connection.on("IncidentResolved", () => {
      void loadIncidents();
      void loadHealth();
      setLastUpdate(new Date());
    });
    connection.on("ProviderSynced", () => {
      void loadAll();
      setLastUpdate(new Date());
    });
    void connection.start().catch(() => {});
    return () => {
      void connection.stop();
    };
  }, []);

  const criticalCount = useMemo(() => incidents.filter((i) => i.severity === 3).length, [incidents]);
  const majorCount = useMemo(() => incidents.filter((i) => i.severity === 2).length, [incidents]);
  const providersDown = useMemo(
    () => new Set(incidents.filter((i) => i.status !== "Resolved").map((i) => i.providerName)).size,
    [incidents]
  );

  const sortedIncidents = useMemo(
    () => [...incidents].sort((a, b) => b.severity - a.severity || +new Date(b.occurredAt) - +new Date(a.occurredAt)),
    [incidents]
  );

  if (!canAccessNoc) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Acceso denegado</h2>
          <p className="mt-2 text-gray-400">Necesitas privilegios de operador NOC para ver esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="border-b border-gray-800 bg-gray-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Centro de Operaciones NOC</h1>
            <p className="mt-1 text-sm text-gray-400">
              Última actualización: {lastUpdate.toISOString().slice(11, 19)} UTC
            </p>
          </div>
          <Clock />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 p-4 md:grid-cols-5">
        <div className="rounded-2xl bg-gray-900 p-5 text-center ring-1 ring-gray-800">
          <p className="text-sm text-gray-400">Puntuación de salud</p>
          <p className={`mt-2 text-4xl font-bold ${(healthScore ?? 100) >= 90 ? "text-green-400" : (healthScore ?? 100) >= 70 ? "text-yellow-400" : "text-red-400"}`}>
            {loading && healthScore === null ? "—" : `${healthScore?.toFixed(0) ?? "100"}`}
          </p>
        </div>
        <div className="rounded-2xl bg-gray-900 p-5 text-center ring-1 ring-gray-800">
          <p className="text-sm text-gray-400">Uptime global</p>
          <p className={`mt-2 text-4xl font-bold ${(overallUptime ?? 100) >= 99 ? "text-green-400" : (overallUptime ?? 100) >= 95 ? "text-yellow-400" : "text-red-400"}`}>
            {loading && overallUptime === null ? "—" : `${overallUptime?.toFixed(2) ?? "—"}%`}
          </p>
        </div>
        <div className="rounded-2xl bg-gray-900 p-5 text-center ring-1 ring-gray-800">
          <p className="text-sm text-gray-400">Crítico</p>
          <p className="mt-2 text-4xl font-bold text-red-400">{criticalCount}</p>
        </div>
        <div className="rounded-2xl bg-gray-900 p-5 text-center ring-1 ring-gray-800">
          <p className="text-sm text-gray-400">Mayor</p>
          <p className="mt-2 text-4xl font-bold text-orange-400">{majorCount}</p>
        </div>
        <div className="rounded-2xl bg-gray-900 p-5 text-center ring-1 ring-gray-800">
          <p className="text-sm text-gray-400">Proveedores afectados</p>
          <p className="mt-2 text-4xl font-bold text-white">{providersDown}</p>
        </div>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedIncidents.map((inc) => (
          <div
            key={inc.id}
            className="rounded-2xl bg-gray-900 p-5 ring-1 ring-gray-800"
            style={{ borderLeft: `6px solid ${severityColor(inc.severity)}` }}
          >
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-gray-800 px-2 py-1 text-xs font-medium text-gray-300">
                {inc.providerName}
              </span>
              <span className="text-xs text-gray-500">{new Date(inc.occurredAt).toLocaleTimeString()}</span>
            </div>
            <h3 className="mt-3 text-lg font-semibold text-white">{inc.title}</h3>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: severityColor(inc.severity) }}>
                {severityLabel(inc.severity)}
              </span>
              <span className="text-xs text-gray-500">{inc.status}</span>
            </div>
          </div>
        ))}
        {sortedIncidents.length === 0 && !loading && (
          <div className="col-span-full flex h-64 items-center justify-center rounded-2xl bg-gray-900 text-gray-500 ring-1 ring-gray-800">
            Todos los sistemas operativos. Sin incidentes activos.
          </div>
        )}
        {loading && sortedIncidents.length === 0 && (
          <div className="col-span-full grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-900 ring-1 ring-gray-800" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
