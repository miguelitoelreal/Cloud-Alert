import { useEffect, useState } from "react";
import { apiClient } from "../services/apiClient";

interface AlertSubscription {
  id: string;
  name: string;
  minSeverity: number;
  isEnabled: boolean;
  providerIds: string[];
  services: string[];
  regions: string[];
  quietHoursEnabled: boolean;
  deduplicationMinutes: number;
  cooldownMinutes: number;
  groupSimilarIncidents: boolean;
}

function severityLabel(s: number): string {
  const map: Record<number, string> = { 0: "Info", 1: "Menor", 2: "Mayor", 3: "Crítico" };
  return map[s] ?? "Desconocido";
}

function severityBadgeClass(s: number): string {
  const map: Record<number, string> = {
    0: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    1: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    2: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    3: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };
  return map[s] ?? "bg-gray-100 text-gray-800";
}

export function AlertSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<AlertSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [minSeverity, setMinSeverity] = useState(2);

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<AlertSubscription[]>("/api/cloud-status/subscriptions");
      setSubscriptions(res.data);
      setError(null);
    } catch {
      setError("Error al cargar suscripciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async () => {
    try {
      await apiClient.post("/api/cloud-status/subscriptions", {
        name,
        minSeverity,
        providerIds: [],
        services: [],
        regions: [],
      });
      setShowForm(false);
      setName("");
      setMinSeverity(2);
      void load();
    } catch {
      setError("Error al crear suscripción");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta suscripción?")) return;
    try {
      await apiClient.delete(`/api/cloud-status/subscriptions/${id}`);
      void load();
    } catch {
      setError("Error al eliminar suscripción");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Suscripciones de alerta</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gestionar reglas de alerta de incidentes cloud</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? "Cancelar" : "Nueva suscripción"}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Nueva suscripción</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="Ej. Alertas críticas de AWS"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Severidad mínima</label>
              <select
                value={minSeverity}
                onChange={(e) => setMinSeverity(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value={0}>Info</option>
                <option value={1}>Menor</option>
                <option value={2}>Mayor</option>
                <option value={3}>Crítico</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => void handleCreate()}
                className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && subscriptions.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
              Aún no hay suscripciones de alerta.
            </div>
          )}
          {subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${severityBadgeClass(sub.minSeverity)}`}>
                    {severityLabel(sub.minSeverity)}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">{sub.name}</span>
                  {!sub.isEnabled && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                      Desactivado
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                  {sub.services.length > 0 && (
                    <span>Servicios: {sub.services.join(", ")}</span>
                  )}
                  {sub.regions.length > 0 && (
                    <span>Regiones: {sub.regions.join(", ")}</span>
                  )}
                  {sub.providerIds.length > 0 && (
                    <span>Proveedores: {sub.providerIds.length}</span>
                  )}
                  <span>Deduplicación: {sub.deduplicationMinutes}m</span>
                  <span>Cooldown: {sub.cooldownMinutes}m</span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(sub.id)}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
