import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { apiClient } from "../services/apiClient";
import { getCloudProviderOptions } from "../services/alerts";

interface CloudProviderOption {
  id: string;
  name: string;
}

interface SlaDefinition {
  id: string;
  name: string;
  cloudProviderId: string | null;
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
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formTarget, setFormTarget] = useState("99.9");
  const [formWindow, setFormWindow] = useState("30");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [providers, setProviders] = useState<CloudProviderOption[]>([]);
  const [formProviderId, setFormProviderId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadProviders = async () => {
    try {
      const data = await getCloudProviderOptions();
      setProviders(data);
    } catch {
      // ignore
    }
  };

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
    void loadProviders();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setFormName("");
    setFormTarget("99.9");
    setFormWindow("30");
    setFormProviderId(null);
    setFormOpen(true);
  };

  const openEdit = (def: SlaDefinition) => {
    setEditingId(def.id);
    setFormName(def.name);
    setFormTarget(String(def.targetUptimePercent));
    setFormWindow(String(def.measurementWindowDays));
    setFormProviderId(def.cloudProviderId);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        cloudProviderId: formProviderId,
        targetUptimePercent: Number(formTarget),
        measurementWindowDays: Number(formWindow),
      };
      if (editingId) {
        await apiClient.put(`/api/cloud-status/sla-definitions/${editingId}`, payload);
      } else {
        await apiClient.post("/api/cloud-status/sla-definitions", payload);
      }
      await load();
      closeForm();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Error al guardar la definición.");
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = (id: string) => {
    setDeleteId(id);
    setDeleteConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setDeleteId(null);
    setDeleting(false);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/cloud-status/sla-definitions/${deleteId}`);
      await load();
      closeDeleteConfirm();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Error al eliminar.");
    } finally {
      setDeleting(false);
    }
  };

  const generateReport = async (id: string) => {
    setGenerating(id);
    try {
      await apiClient.post(`/api/cloud-status/sla-definitions/${id}/generate-report`);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Error al generar reporte.");
    } finally {
      setGenerating(null);
    }
  };

  const chartData = reports.map((r) => ({
    name: `${new Date(r.periodStart).toLocaleDateString()} - ${new Date(r.periodEnd).toLocaleDateString()}`,
    actual: Number(r.actualUptimePercent.toFixed(2)),
    target: definitions.length > 0 ? Number(definitions[0].targetUptimePercent.toFixed(2)) : 99.9,
    downtime: r.downtimeMinutes,
    breach: r.breachCount,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard de SLA</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Objetivos de uptime y reportes de cumplimiento</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva definición
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-900/40 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-auto text-xs text-red-400 hover:text-red-200">Cerrar</button>
        </div>
      )}

      {loading && definitions.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
          ))}
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

          {definitions.length === 0 && !loading && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800/50">
              <p className="text-sm text-gray-500 dark:text-gray-400">No hay definiciones de SLA creadas.</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Crea una para empezar a monitorear objetivos de uptime.</p>
            </div>
          )}

          {definitions.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Definiciones de SLA</h2>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {definitions.map((def) => (
                  <div key={def.id} className="flex items-center justify-between py-4 px-6">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{def.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Ventana: {def.measurementWindowDays} días · Proveedor: {providers.find(p => p.id === def.cloudProviderId)?.name ?? "Todos"}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{def.targetUptimePercent}%</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Objetivo</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => generateReport(def.id)}
                          disabled={generating === def.id}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-800 dark:text-slate-200 dark:hover:bg-slate-600"
                        >
                          {generating === def.id ? "Generando..." : "Generar reporte"}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(def)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-800 dark:text-slate-200 dark:hover:bg-slate-600"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteConfirm(def.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:bg-slate-700 dark:text-red-400 dark:hover:bg-red-950/20"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          Eliminar
                        </button>
                      </div>
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

      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-red-900/30 bg-white dark:bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-950/60">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Eliminar definición de SLA</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Esta acción eliminará la definición y todos sus reportes asociados. No se puede deshacer.
                </p>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                disabled={deleting}
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
              >
                {deleting ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingId ? "Editar definición de SLA" : "Nueva definición de SLA"}
            </h3>
            <form onSubmit={submit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej. Microsoft 365 - Uptime mensual"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Uptime objetivo (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formTarget}
                  onChange={(e) => setFormTarget(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ventana de medición (días)</label>
                <input
                  type="number"
                  min="1"
                  value={formWindow}
                  onChange={(e) => setFormWindow(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Proveedor cloud</label>
                <select
                  value={formProviderId ?? ""}
                  onChange={(e) => setFormProviderId(e.target.value || null)}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Todos los proveedores</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
