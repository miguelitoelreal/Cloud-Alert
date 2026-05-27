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

export function CloudAnalyticsPage() {
  const [analytics, setAnalytics] = useState<CloudProviderAnalytics[]>([]);
  const [monitors, setMonitors] = useState<DashboardMonitorSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [toast, setToast] = useState<string | null>(null);

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
        <div className="flex items-center gap-2">
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
      </div>

      {loading && analytics.length === 0 ? (
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
          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Uptime global</p>
              <p className={`mt-1 text-3xl font-bold ${overallUptime >= 99 ? "text-green-600" : overallUptime >= 95 ? "text-yellow-500" : "text-red-500"}`}>
                {overallUptime.toFixed(2)}%
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Incidentes totales</p>
              <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{totalIncidents}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Tiempo de caída total</p>
              <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{totalDowntime}m</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Providers</p>
              <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{analytics.length}</p>
            </div>
          </div>

          {/* Comparación de Providers */}
          {providerComparisonData.length >= 2 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Comparación de providers</h3>
              <div className="h-72">
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

          {/* Comparación de Monitores */}
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

          {severityChartData.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Incidentes por severidad</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={severityChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    />
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
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Tendencias de incidentes</h3>
              <div className="h-72">
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
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="activos" stroke="#ef4444" fillOpacity={1} fill="url(#colorActivos)" name="Activos" />
                    <Area type="monotone" dataKey="resueltos" stroke="#22c55e" fillOpacity={1} fill="url(#colorResueltos)" name="Resueltos" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Tabla de Providers */}
          <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Desglose de providers</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  <tr>
                    <th className="px-6 py-3 font-medium">Provider</th>
                    <th className="px-6 py-3 font-medium">Uptime</th>
                    <th className="px-6 py-3 font-medium">Incidentes</th>
                    <th className="px-6 py-3 font-medium">MTTR</th>
                    <th className="px-6 py-3 font-medium">Downtime</th>
                    <th className="px-6 py-3 font-medium">Severidad</th>
                    <th className="px-6 py-3 font-medium">Tendencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {analytics.map((a) => {
                    const trendData = a.trends.map((t) => t.activeIncidents + t.resolvedIncidents);
                    return (
                      <tr key={a.providerId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{a.providerName}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${a.uptimePercent >= 99 ? "text-green-600" : a.uptimePercent >= 95 ? "text-yellow-500" : "text-red-500"}`}>
                              {a.uptimePercent.toFixed(2)}%
                            </span>
                          </div>
                          <MiniBar value={a.uptimePercent} max={100} color={a.uptimePercent >= 99 ? "#22c55e" : a.uptimePercent >= 95 ? "#eab308" : "#ef4444"} />
                        </td>
                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{a.incidentCount}</td>
                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{a.avgMttrMinutes}m</td>
                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{a.downtimeMinutes}m</td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {a.severityDistribution.map((s) => (
                              <div key={s.severity} className="flex items-center gap-2 text-xs">
                                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: severityColor(s.severity) }} />
                                <span className="text-gray-600 dark:text-gray-400">{severityLabel(s.severity)}:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{s.count}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <TrendSparkline data={trendData} color="#3b82f6" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {analytics.length === 0 && (
                <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  No hay datos de analítica para el período seleccionado.
                </div>
              )}
            </div>
          </div>

          {/* Tabla de Monitores */}
          {monitors.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Desglose de monitores</h2>
              </div>
              <div className="overflow-x-auto">
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
    </div>
  );
}
