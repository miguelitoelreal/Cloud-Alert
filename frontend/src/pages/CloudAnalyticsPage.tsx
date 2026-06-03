import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { apiClient } from "../services/apiClient";
import { createMonitoringConnection } from "../services/signalr";
import type { HubConnection } from "@microsoft/signalr";
import { getDashboardMonitors } from "../services/dashboard";
import type { DashboardMonitorSummaryDto } from "../types/dashboard";

interface CloudProviderAnalytics {
  providerId: string;
  providerName: string;
  providerSlug: string;
  uptimePercent: number;
  incidentCount: number;
  activeIncidents: number;
  avgMttrMinutes: number;
  downtimeMinutes: number;
  severityDistribution: { severity: number; count: number }[];
  trends: { date: string; activeIncidents: number; resolvedIncidents: number }[];
}

function severityLabel(s: number): string {
  const map: Record<number, string> = { 0: "Info", 1: "Menor", 2: "Mayor", 3: "Crítico" };
  return map[s] ?? "Desconocido";
}

function severityColor(s: number): string {
  const map: Record<number, string> = { 0: "#3b82f6", 1: "#eab308", 2: "#f97316", 3: "#ef4444" };
  return map[s] ?? "#9ca3af";
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function TrendSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return <div className="h-8" />;
  const max = Math.max(...data, 1);
  const w = 100;
  const h = 32;
  const step = w / (data.length - 1 || 1);
  const points = data.map((v, i) => `${i * step},${h - (v / max) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8" preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth={2} points={points} />
    </svg>
  );
}

function aggregateSeverityData(analytics: CloudProviderAnalytics[]) {
  const map: Record<string, Record<string, number>> = {};
  const providers = analytics.map((a) => a.providerName);
  providers.forEach((p) => (map[p] = { Info: 0, Menor: 0, Mayor: 0, Crítico: 0 }));
  analytics.forEach((a) => {
    a.severityDistribution.forEach((s) => {
      map[a.providerName][severityLabel(s.severity)] = s.count;
    });
  });
  return providers.map((p) => ({ name: p, ...map[p] }));
}

function aggregateTrends(analytics: CloudProviderAnalytics[]) {
  const dateMap: Record<string, { activos: number; resueltos: number }> = {};
  analytics.forEach((a) => {
    a.trends.forEach((t) => {
      const d = t.date.slice(0, 10);
      if (!dateMap[d]) dateMap[d] = { activos: 0, resueltos: 0 };
      dateMap[d].activos += t.activeIncidents;
      dateMap[d].resueltos += t.resolvedIncidents;
    });
  });
  return Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));
}

function CompareSection({ analytics, compareA, compareB }: { analytics: CloudProviderAnalytics[]; compareA: string; compareB: string }) {
  function computeDaysWithIncidents(trends: CloudProviderAnalytics["trends"]) {
    return trends.filter((t) => t.activeIncidents > 0).length;
  }
  function computeDaysWithoutIncidents(trends: CloudProviderAnalytics["trends"]) {
    return trends.filter((t) => t.activeIncidents === 0).length;
  }

  const a = analytics.find((x) => x.providerId === compareA);
  const b = analytics.find((x) => x.providerId === compareB);
  if (!a || !b) return null;

  const daysA = computeDaysWithIncidents(a.trends);
  const daysB = computeDaysWithIncidents(b.trends);
  const daysNoA = computeDaysWithoutIncidents(a.trends);
  const daysNoB = computeDaysWithoutIncidents(b.trends);
  const totalDaysA = a.trends.length || 1;
  const totalDaysB = b.trends.length || 1;
  const hoursA = (a.uptimePercent / 100) * 24 * totalDaysA;
  const hoursB = (b.uptimePercent / 100) * 24 * totalDaysB;

  const rows = [
    { label: "Uptime (Tiempo Operativo)", a: a.uptimePercent, b: b.uptimePercent, fmt: "percent" as const, better: "higher" as const },
    { label: "SLA Actual", a: a.uptimePercent, b: b.uptimePercent, fmt: "percent" as const, better: "higher" as const },
    { label: "Días con incidencias", a: daysA, b: daysB, fmt: "number" as const, better: "lower" as const },
    { label: "Días sin incidencias", a: daysNoA, b: daysNoB, fmt: "number" as const, better: "higher" as const },
    { label: "Total de incidentes", a: a.incidentCount, b: b.incidentCount, fmt: "number" as const, better: "lower" as const },
    { label: "Tiempo de inactividad", a: a.downtimeMinutes, b: b.downtimeMinutes, fmt: "minutes" as const, better: "lower" as const },
    { label: "Horas de actividad", a: hoursA, b: hoursB, fmt: "hours" as const, better: "higher" as const },
  ];

  const aWins = rows.filter((r) => r.better === "higher" ? r.a > r.b : r.a < r.b).length;
  const bWins = rows.filter((r) => r.better === "higher" ? r.b > r.a : r.b < r.a).length;
  const winner = aWins > bWins ? a.providerName : bWins > aWins ? b.providerName : "Empate";

  return (
    <>
      <div className="flex items-center justify-between rounded-xl border border-emerald-200 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.001 3.001 0 00-5.519 0A3.75 3.75 0 0112 21a3.75 3.75 0 01-3.888-2.932 3.001 3.001 0 00-5.519 0A3 3 0 013 12c0-5.385 4.365-9.75 9.75-9.75S22.5 6.615 22.5 12z" /></svg>
          <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Mejor opción: {winner}</span>
        </div>
        <span className="text-xs text-emerald-600 dark:text-emerald-400">{aWins} vs {bWins} métricas ganadas</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${a.activeIncidents > 0 ? "bg-red-500" : "bg-emerald-500"}`} />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{a.providerName}</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {a.activeIncidents > 0 ? `${a.activeIncidents} incidente${a.activeIncidents > 1 ? "s" : ""} activo${a.activeIncidents > 1 ? "s" : ""}` : "Operativo"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${b.activeIncidents > 0 ? "bg-red-500" : "bg-emerald-500"}`} />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{b.providerName}</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {b.activeIncidents > 0 ? `${b.activeIncidents} incidente${b.activeIncidents > 1 ? "s" : ""} activo${b.activeIncidents > 1 ? "s" : ""}` : "Operativo"}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Comparación de métricas</h3>
        </div>

        {/* Vista de tarjetas en móvil */}
        <div className="md:hidden space-y-3 px-4 py-4">
          {rows.map((row) => {
            const aBetter = row.better === "higher" ? row.a > row.b : row.a < row.b;
            const bBetter = row.better === "higher" ? row.b > row.a : row.b < row.a;
            const fmt = (v: number) => row.fmt === "percent" ? `${v.toFixed(2)}%` : row.fmt === "minutes" ? `${Math.round(v)}m` : row.fmt === "hours" ? `${v.toFixed(1)}h` : String(v);
            return (
              <div key={row.label} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 space-y-2">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{row.label}</div>
                <div className="flex items-center justify-between text-sm">
                  <div className={`font-semibold ${aBetter ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400"}`}>{fmt(row.a)}</div>
                  <div className="text-xs text-slate-400">vs</div>
                  <div className={`font-semibold ${bBetter ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400"}`}>{fmt(row.b)}</div>
                </div>
                <div className="text-center">
                  {aBetter ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">Gana: {a.providerName}</span>
                  ) : bBetter ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">Gana: {b.providerName}</span>
                  ) : (
                    <span className="text-xs text-slate-400">Empate</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Vista de tabla en desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                <th className="px-5 py-3 text-left font-medium text-slate-500 dark:text-slate-400">Métrica</th>
                <th className="px-5 py-3 text-right font-medium text-slate-700 dark:text-slate-300">{a.providerName}</th>
                <th className="px-5 py-3 text-right font-medium text-slate-700 dark:text-slate-300">{b.providerName}</th>
                <th className="px-5 py-3 text-center font-medium text-slate-500 dark:text-slate-400">Ganador</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((row) => {
                const aBetter = row.better === "higher" ? row.a > row.b : row.a < row.b;
                const bBetter = row.better === "higher" ? row.b > row.a : row.b < row.a;
                const fmt = (v: number) => row.fmt === "percent" ? `${v.toFixed(2)}%` : row.fmt === "minutes" ? `${Math.round(v)}m` : row.fmt === "hours" ? `${v.toFixed(1)}h` : String(v);
                return (
                  <tr key={row.label}>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{row.label}</td>
                    <td className={`px-5 py-3 text-right font-semibold ${aBetter ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400"}`}>{fmt(row.a)}</td>
                    <td className={`px-5 py-3 text-right font-semibold ${bBetter ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400"}`}>{fmt(row.b)}</td>
                    <td className="px-5 py-3 text-center">
                      {aBetter ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">{a.providerName}</span>
                      ) : bBetter ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">{b.providerName}</span>
                      ) : (
                        <span className="text-xs text-slate-400">Empate</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export function CloudAnalyticsPage() {
  const [analytics, setAnalytics] = useState<CloudProviderAnalytics[]>([]);
  const [monitors, setMonitors] = useState<DashboardMonitorSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "compare" | "monitors">("overview");
  const [compareA, setCompareA] = useState<string>("");
  const [compareB, setCompareB] = useState<string>("");

  const loadProviders = async () => {
    try {
      const params: Record<string, string> = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await apiClient.get<CloudProviderAnalytics[]>("/api/cloud-status/analytics", { params });
      setAnalytics(res.data);
    } catch {
      setError("Error al cargar analítica de providers");
    }
  };

  const loadMonitors = async () => {
    try {
      const data = await getDashboardMonitors();
      setMonitors(data);
    } catch {
      // monitores opcional, no bloquea
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadProviders(), loadMonitors()]);
    setLoading(false);
  };

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    const connection: HubConnection = createMonitoringConnection();
    connection.on("ProviderSynced", () => {
      void loadProviders();
      setToast("Datos actualizados en tiempo real");
      setTimeout(() => setToast(null), 3000);
    });
    connection.on("IncidentCreated", () => void loadProviders());
    connection.on("MonitorUpdated", () => void loadMonitors());
    void connection.start().catch(() => {});
    return () => {
      void connection.stop();
    };
  }, []);

  const overallUptime = useMemo(() => {
    if (analytics.length === 0) return 0;
    const sum = analytics.reduce((acc, a) => acc + a.uptimePercent, 0);
    return Math.round((sum / analytics.length) * 100) / 100;
  }, [analytics]);

  const totalIncidents = useMemo(() => analytics.reduce((acc, a) => acc + a.incidentCount, 0), [analytics]);
  const totalDowntime = useMemo(() => analytics.reduce((acc, a) => acc + a.downtimeMinutes, 0), [analytics]);

  const severityChartData = useMemo(() => aggregateSeverityData(analytics), [analytics]);
  const trendChartData = useMemo(() => aggregateTrends(analytics), [analytics]);

  const monitorComparisonData = useMemo(() => {
    return monitors.map((m) => ({
      name: m.name,
      uptime: Math.round((m.uptimePercentage ?? 0) * 100) / 100,
      respTime: m.lastResponseTimeMs ?? 0,
      checks: m.totalChecks,
      fallas: m.failedChecks,
    }));
  }, [monitors]);

  const providerComparisonData = useMemo(() => {
    return analytics.map((a) => ({
      name: a.providerName,
      uptime: Math.round(a.uptimePercent * 100) / 100,
      incidentes: a.incidentCount,
      mttr: a.avgMttrMinutes,
      downtime: a.downtimeMinutes,
    }));
  }, [analytics]);

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-green-600 px-4 py-2 text-white shadow-lg">{toast}</div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analítica Cloud</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Uptime de providers, incidentes y tendencias</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1">
        {(["overview", "compare", "monitors"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors sm:px-4 sm:py-2 sm:text-sm ${
              activeTab === tab
                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {tab === "overview" ? "Resumen" : tab === "compare" ? "Comparar" : "Monitores"}
          </button>
        ))}
      </div>

      {activeTab === "compare" && (
        <div className="space-y-4">
          {/* Provider selectors */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 min-w-0">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0">Servicio 1</label>
              <select
                className="max-w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
                value={compareA}
                onChange={(e) => setCompareA(e.target.value)}
              >
                <option value="">Seleccionar...</option>
                {analytics.map((a) => (
                  <option key={a.providerId} value={a.providerId}>{a.providerName}</option>
                ))}
              </select>
            </div>
            <span className="hidden text-slate-400 sm:block">vs</span>
            <div className="flex items-center gap-2 min-w-0">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0">Servicio 2</label>
              <select
                className="max-w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
                value={compareB}
                onChange={(e) => setCompareB(e.target.value)}
              >
                <option value="">Seleccionar...</option>
                {analytics.map((a) => (
                  <option key={a.providerId} value={a.providerId}>{a.providerName}</option>
                ))}
              </select>
            </div>
          </div>

          {compareA && compareB && <CompareSection analytics={analytics} compareA={compareA} compareB={compareB} />}
        </div>
      )}

      {activeTab === "monitors" && (
        <>
          {loading && monitors.length === 0 ? (
            <div className="grid gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
              ))}
            </div>
          ) : (
            <>
              {/* Monitors comparison chart */}
              {monitorComparisonData.length >= 2 && (
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                  <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Comparación de monitores</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monitorComparisonData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                        <Legend />
                        <Bar dataKey="uptime" name="Uptime %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="respTime" name="Tiempo respuesta (ms)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="fallas" name="Fallas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Monitors table */}
              {monitors.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                  <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Desglose de monitores</h2>
                  </div>

                  {/* Vista de tarjetas en móvil */}
                  <div className="md:hidden space-y-3 px-4 py-4">
                    {monitors.map((m) => (
                      <div key={m.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 dark:text-white">{m.name}</span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${m.currentStatus === 0 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"}`}>
                            {m.currentStatus === 0 ? "Online" : "Offline"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-xs text-gray-500">Uptime</span>
                            <div className={`font-semibold ${(m.uptimePercentage ?? 0) >= 99 ? "text-green-600" : (m.uptimePercentage ?? 0) >= 95 ? "text-yellow-500" : "text-red-500"}`}>
                              {(m.uptimePercentage ?? 0).toFixed(2)}%
                            </div>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Respuesta</span>
                            <div className="font-semibold text-gray-700 dark:text-gray-300">
                              {m.lastResponseTimeMs != null ? `${m.lastResponseTimeMs}ms` : "—"}
                            </div>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Checks</span>
                            <div className="font-semibold text-gray-700 dark:text-gray-300">{m.totalChecks}</div>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Fallas</span>
                            <div className="font-semibold text-gray-700 dark:text-gray-300">{m.failedChecks}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Vista de tabla en desktop */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                          <th className="px-6 py-3 font-medium">Monitor</th>
                          <th className="px-6 py-3 font-medium">Estado</th>
                          <th className="px-6 py-3 font-medium">Uptime</th>
                          <th className="px-6 py-3 font-medium">Checks</th>
                          <th className="px-6 py-3 font-medium">Fallas</th>
                          <th className="px-6 py-3 font-medium">Respuesta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {monitors.map((m) => (
                          <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{m.name}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${m.currentStatus === 0 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"}`}>
                                {m.currentStatus === 0 ? "Online" : "Offline"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`font-semibold ${(m.uptimePercentage ?? 0) >= 99 ? "text-green-600" : (m.uptimePercentage ?? 0) >= 95 ? "text-yellow-500" : "text-red-500"}`}>
                                {(m.uptimePercentage ?? 0).toFixed(2)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{m.totalChecks}</td>
                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{m.failedChecks}</td>
                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                              {m.lastResponseTimeMs != null ? `${m.lastResponseTimeMs}ms` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {activeTab === "overview" && (loading && analytics.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      ) : (
        <>
          {/* Filtros de fecha solo en Resumen */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            <button
              onClick={() => void loadAll()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Aplicar
            </button>
          </div>

          {/* KPIs modernos */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3.5">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${overallUptime >= 99 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400" : overallUptime >= 95 ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400" : "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"}`}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.001 3.001 0 00-5.519 0A3.75 3.75 0 0112 21a3.75 3.75 0 01-3.888-2.932 3.001 3.001 0 00-5.519 0A3 3 0 013 12c0-5.385 4.365-9.75 9.75-9.75S22.5 6.615 22.5 12z" /></svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Uptime global</p>
                <p className={`text-xl font-bold ${overallUptime >= 99 ? "text-emerald-600 dark:text-emerald-400" : overallUptime >= 95 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>{overallUptime.toFixed(2)}%</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Incidentes totales</p>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{totalIncidents}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Tiempo de caída</p>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{totalDowntime}m</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.88-7.021A7.003 7.003 0 0015.75 7.5H15m-6 0a7.003 7.003 0 00-6.88 5.271A4.5 4.5 0 002.25 15z" /></svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Providers</p>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{analytics.length}</p>
              </div>
            </div>
          </div>

          {/* Gráficos en grid de 2 */}
          <div className="grid gap-4 lg:grid-cols-2">
            {providerComparisonData.length >= 2 && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Comparación de providers</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={providerComparisonData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                      <Legend />
                      <Bar dataKey="uptime" name="Uptime %" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="incidentes" name="Incidentes" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="downtime" name="Downtime (m)" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {severityChartData.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Incidentes por severidad</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={severityChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                      <Legend />
                      <Bar dataKey="Info" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Menor" stackId="a" fill="#eab308" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Mayor" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Crítico" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {trendChartData.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 lg:col-span-2">
                <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Tendencias de incidentes</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendChartData}>
                      <defs>
                        <linearGradient id="colorActivos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorResueltos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                      <Legend />
                      <Area type="monotone" dataKey="activos" stroke="#ef4444" fillOpacity={1} fill="url(#colorActivos)" name="Activos" />
                      <Area type="monotone" dataKey="resueltos" stroke="#22c55e" fillOpacity={1} fill="url(#colorResueltos)" name="Resueltos" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Tabla de Providers */}
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Desglose de providers</h2>
            </div>

            {/* Vista de tarjetas en móvil */}
            <div className="md:hidden space-y-3 px-4 py-4">
              {analytics.map((a) => {
                const trendData = a.trends.map((t) => t.activeIncidents + t.resolvedIncidents);
                return (
                  <div key={a.providerId} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 space-y-2">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{a.providerName}</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-xs text-slate-500">Uptime</span>
                        <div className={`font-semibold ${a.uptimePercent >= 99 ? "text-emerald-600" : a.uptimePercent >= 95 ? "text-amber-500" : "text-red-500"}`}>
                          {a.uptimePercent.toFixed(2)}%
                        </div>
                        <MiniBar value={a.uptimePercent} max={100} color={a.uptimePercent >= 99 ? "#22c55e" : a.uptimePercent >= 95 ? "#eab308" : "#ef4444"} />
                      </div>
                      <div>
                        <span className="text-xs text-slate-500">Incidentes</span>
                        <div className="font-semibold text-slate-700 dark:text-slate-300">{a.incidentCount}</div>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500">MTTR</span>
                        <div className="font-semibold text-slate-700 dark:text-slate-300">{a.avgMttrMinutes}m</div>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500">Downtime</span>
                        <div className="font-semibold text-slate-700 dark:text-slate-300">{a.downtimeMinutes}m</div>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">Severidad</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {a.severityDistribution.map((s) => (
                          <span key={s.severity} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: severityColor(s.severity) }} />
                            {severityLabel(s.severity)}: {s.count}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">Tendencia</span>
                      <TrendSparkline data={trendData} color="#3b82f6" />
                    </div>
                  </div>
                );
              })}
              {analytics.length === 0 && (
                <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  No hay datos de analítica para el período seleccionado.
                </div>
              )}
            </div>

            {/* Vista de tabla en desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-medium">Provider</th>
                    <th className="px-5 py-3 font-medium">Uptime</th>
                    <th className="px-5 py-3 font-medium">Incidentes</th>
                    <th className="px-5 py-3 font-medium">MTTR</th>
                    <th className="px-5 py-3 font-medium">Downtime</th>
                    <th className="px-5 py-3 font-medium">Severidad</th>
                    <th className="px-5 py-3 font-medium">Tendencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {analytics.map((a) => {
                    const trendData = a.trends.map((t) => t.activeIncidents + t.resolvedIncidents);
                    return (
                      <tr key={a.providerId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-slate-100">{a.providerName}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${a.uptimePercent >= 99 ? "text-emerald-600" : a.uptimePercent >= 95 ? "text-amber-500" : "text-red-500"}`}>
                              {a.uptimePercent.toFixed(2)}%
                            </span>
                          </div>
                          <MiniBar value={a.uptimePercent} max={100} color={a.uptimePercent >= 99 ? "#22c55e" : a.uptimePercent >= 95 ? "#eab308" : "#ef4444"} />
                        </td>
                        <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">{a.incidentCount}</td>
                        <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">{a.avgMttrMinutes}m</td>
                        <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">{a.downtimeMinutes}m</td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {a.severityDistribution.map((s) => (
                              <span key={s.severity} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: severityColor(s.severity) }} />
                                {severityLabel(s.severity)}: {s.count}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <TrendSparkline data={trendData} color="#3b82f6" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {analytics.length === 0 && (
                <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                  No hay datos de analítica para el período seleccionado.
                </div>
              )}
            </div>
          </div>

        </>
      ))}
    </div>
  );
}
