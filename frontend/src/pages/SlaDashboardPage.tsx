import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { apiClient } from "../services/apiClient";

interface SlaDefinition {
  id: string;
  name: string;
  targetUptimePercent: number;
  measurementWindowDays: number;
}

interface SlaReport {
  id: string;
  periodStart: string;
  periodEnd: string;
  actualUptimePercent: number;
  downtimeMinutes: number;
  breachCount: number;
}

export function SlaDashboardPage() {
  const [definitions, setDefinitions] = useState<SlaDefinition[]>([]);
  const [reports, setReports] = useState<SlaReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [defRes, repRes] = await Promise.all([
        apiClient.get<SlaDefinition[]>("/api/cloud-status/sla-definitions"),
        apiClient.get<SlaReport[]>("/api/cloud-status/sla-reports"),
      ]);
      setDefinitions(defRes.data);
      setReports(repRes.data);
      setError(null);
    } catch {
      setError("Error al cargar datos de SLA");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const chartData = reports.map((r) => ({
    name: `${new Date(r.periodStart).toLocaleDateString()} - ${new Date(r.periodEnd).toLocaleDateString()}`,
    actual: Number(r.actualUptimePercent.toFixed(2)),
    target: definitions.length > 0 ? Number(definitions[0].targetUptimePercent.toFixed(2)) : 99.9,
    downtime: r.downtimeMinutes,
    breach: r.breachCount,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard de SLA</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Objetivos de uptime y reportes de cumplimiento</p>
      </div>

      {loading && definitions.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Definiciones de SLA</p>
              <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{definitions.length}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Reportes</p>
              <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{reports.length}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Incumplimientos totales</p>
              <p className="mt-1 text-3xl font-bold text-red-500">{reports.reduce((a, r) => a + r.breachCount, 0)}</p>
            </div>
          </div>

          {definitions.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Definiciones de SLA</h2>
              </div>
              <div className="divide-y divide-gray-100 px-6 dark:divide-gray-700">
                {definitions.map((def) => (
                  <div key={def.id} className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{def.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Ventana: {def.measurementWindowDays} días
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{def.targetUptimePercent}%</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Objetivo</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {chartData.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Uptime real vs objetivo</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} angle={-20} textAnchor="end" height={60} />
                    <YAxis stroke="#9ca3af" fontSize={12} domain={[90, 100]} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    />
                    <Legend />
                    <Bar dataKey="actual" name="Uptime real" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.actual >= entry.target ? "#22c55e" : "#ef4444"} />
                      ))}
                    </Bar>
                    <Bar dataKey="target" name="Objetivo" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {reports.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Reportes de SLA</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    <tr>
                      <th className="px-6 py-3 font-medium">Período</th>
                      <th className="px-6 py-3 font-medium">Uptime real</th>
                      <th className="px-6 py-3 font-medium">Tiempo de caída</th>
                      <th className="px-6 py-3 font-medium">Incumplimientos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {reports.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                          {new Date(r.periodStart).toLocaleDateString()} - {new Date(r.periodEnd).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{r.actualUptimePercent.toFixed(2)}%</td>
                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{r.downtimeMinutes}m</td>
                        <td className="px-6 py-4">
                          <span className={`font-medium ${r.breachCount > 0 ? "text-red-600" : "text-green-600"}`}>
                            {r.breachCount}
                          </span>
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
