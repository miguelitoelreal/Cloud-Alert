import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { CloudRegionMap, type RegionStats } from "../components/CloudRegionMap";
import { CloudDisplayStatusBadge } from "../components/CloudDisplayStatusBadge";
import { CloudIncidentSeverityBadge } from "../components/CloudIncidentSeverityBadge";
import { CloudIncidentStatusBadge } from "../components/CloudIncidentStatusBadge";
import { CloudProviderAvatar } from "../components/CloudProviderAvatar";
import { StatCard } from "../components/StatCard";
import { usePolling } from "../hooks/usePolling";
import {
  getCloudStatusOverview,
  refreshCloudStatus,
  translateCloudIncident,
} from "../services/cloudStatus";
import {
  getMicrosoftGraphIncidents,
  getMicrosoftIntegration,
  type MicrosoftGraphIncident,
} from "../services/microsoftIntegration";
import { useSignalRConnection } from "../hooks/useSignalRConnection";
import { useLocalStorage } from "../hooks/useLocalStorage";
import {
  CloudIncidentSeverity,
  cloudIncidentSeverityLabel,
  cloudIncidentStatusLabel,
  CloudStatusSourceType,
  cloudStatusSourceTypeLabel,
  type CloudIncidentDto,
  type CloudIncidentStatus,
  type CloudIncidentTranslationDto,
  type CloudProviderDto,
  type CloudStatusOverviewDto,
} from "../types/cloudStatus";

const REFRESH_OPTIONS = [
  { label: "Manual", value: 0 },
  { label: "15s", value: 15_000 },
  { label: "30s", value: 30_000 },
  { label: "1m", value: 60_000 },
];
const PAGE_SIZE = 80;

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-PE", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function relativeFreshness(value: string | null): string {
  if (!value) return "Sin sincronización reciente";
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return "Actualizado hace menos de 1 min";
  const diffMinutes = Math.round(diffMs / 60_000);
  if (diffMinutes < 60) return `Actualizado hace ${diffMinutes} min`;
  const diffHours = Math.round(diffMinutes / 60);
  return `Actualizado hace ${diffHours} h`;
}

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const peruTime = time.toLocaleTimeString("es-PE", {
    timeZone: "America/Lima",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const peruDate = time.toLocaleDateString("es-PE", {
    timeZone: "America/Lima",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return (
    <div className="text-right">
      <div className="text-3xl font-bold text-slate-100">{peruTime}</div>
      <div className="text-xs text-slate-400 capitalize">{peruDate} · Hora Perú</div>
    </div>
  );
}

function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function exportToCSV(incidents: UnifiedIncident[], filename: string) {
  const headers = ["Proveedor", "Título", "Severidad", "Estado", "Activo", "Región", "Servicios afectados", "Fecha inicio", "Última actualización"];
  const rows = incidents.map((item) => {
    if (item.type === "cloud") {
      const i = item.data;
      const services = Array.isArray(i.affectedServices) ? i.affectedServices.join("; ") : "—";
      return [
        escapeCsvCell(i.providerName),
        escapeCsvCell(i.title),
        escapeCsvCell(cloudIncidentSeverityLabel(i.severity)),
        escapeCsvCell(cloudIncidentStatusLabel(i.status)),
        i.isActive ? "Sí" : "No",
        escapeCsvCell(i.region ?? "—"),
        escapeCsvCell(services),
        escapeCsvCell(formatDateTime(i.occurredAt)),
        escapeCsvCell(formatDateTime(i.lastUpdatedAt)),
      ];
    }
    const i = item.data;
    const services = Array.isArray(i.affectedServices) ? i.affectedServices.join("; ") : "—";
    return [
      escapeCsvCell("Microsoft 365"),
      escapeCsvCell(i.title),
      escapeCsvCell(cloudIncidentSeverityLabel(i.severity as CloudIncidentSeverity)),
      escapeCsvCell(cloudIncidentStatusLabel(i.status as CloudIncidentStatus)),
      i.isActive ? "Sí" : "No",
      "—",
      escapeCsvCell(services),
      escapeCsvCell(formatDateTime(i.occurredAt)),
      escapeCsvCell(formatDateTime(i.lastUpdatedAt)),
    ];
  });
  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function severityFilterOptions() {
  return [
    { label: "Todas las severidades", value: "" },
    { label: "Crítica", value: String(CloudIncidentSeverity.Critical) },
    { label: "Mayor", value: String(CloudIncidentSeverity.Major) },
    { label: "Menor", value: String(CloudIncidentSeverity.Minor) },
    {
      label: "Informativa",
      value: String(CloudIncidentSeverity.Informational),
    },
  ];
}

function sortProviders(providers: CloudProviderDto[]): CloudProviderDto[] {
  return [...providers].sort((a, b) => a.name.localeCompare(b.name));
}

type UnifiedIncident =
  | { type: "cloud"; data: CloudIncidentDto }
  | { type: "microsoft"; data: MicrosoftGraphIncident };

const INCIDENTS_PER_PAGE = 10;

export function CloudStatusPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [overview, setOverview] = useState<CloudStatusOverviewDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [providerFilter, setProviderFilter] = useLocalStorage("cs-filter-provider", searchParams.get("provider") ?? "");
  const [severityFilter, setSeverityFilter] = useLocalStorage("cs-filter-severity", searchParams.get("severity") ?? "");
  const [activeOnly, setActiveOnly] = useLocalStorage("cs-filter-active", searchParams.get("active") === "1");
  const [dateFrom, setDateFrom] = useLocalStorage("cs-filter-from", searchParams.get("from") ?? "");
  const [dateTo, setDateTo] = useLocalStorage("cs-filter-to", searchParams.get("to") ?? "");
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [viewMode, setViewMode] = useLocalStorage<"list" | "map">("cs-viewmode", "list");
  const [selectedRegion, setSelectedRegion] = useState<RegionStats | null>(null);
  const [refreshInterval, setRefreshInterval] = useLocalStorage("cs-refresh-interval", 30_000);
  const [currentPage, setCurrentPage] = useState(1);
  const [translationCache, setTranslationCache] = useState<
    Record<string, CloudIncidentTranslationDto>
  >({});
  const [msIncidents, setMsIncidents] = useState<MicrosoftGraphIncident[]>([]);
  const [msLoading, setMsLoading] = useState(false);
  const [msError, setMsError] = useState<string | null>(null);
  const [msIntegrationConfigured, setMsIntegrationConfigured] = useState<
    boolean | null
  >(null);
  const [lastDataRefresh, setLastDataRefresh] = useState<Date | null>(null);

  // Toast for new incidents
  const [toast, setToast] = useState<{ message: string; severity: number } | null>(null);
  const prevIncidentIds = useRef<Set<string>>(new Set());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track newly arrived incidents for "Nuevo" badge
  const [newIncidentIds, setNewIncidentIds] = useState<Set<string>>(new Set());
  const newBadgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMsIncidents = useCallback(async () => {
    setMsLoading(true);
    setMsError(null);
    try {
      const data = await getMicrosoftGraphIncidents();
      setMsIncidents(data);
    } catch (err: unknown) {
      let msg = "No se pudieron cargar las incidencias de Microsoft 365.";
      if (err instanceof Error) {
        if (err.message.includes("401")) {
          msg = "Sesión expirada. Vuelve a iniciar sesión para ver incidencias de Microsoft 365.";
        } else if (err.message.includes("400")) {
          msg = "Integración de Microsoft 365 no configurada. Ve a Integraciones para configurarla.";
        } else if (err.message.includes("502")) {
          msg = "Error al conectar con Microsoft Graph. Verifica las credenciales y permisos en Integraciones.";
        }
      }
      setMsError(msg);
    } finally {
      setMsLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getCloudStatusOverview({
        provider: providerFilter || undefined,
        severity: severityFilter ? Number(severityFilter) : undefined,
        activeOnly,
        take: PAGE_SIZE,
      });
      const oldIds = prevIncidentIds.current;
      const newIds = new Set(data.incidents.map((i) => i.id));
      const added = data.incidents.filter((i) => !oldIds.has(i.id));
      if (added.length > 0) {
        const critical = added.filter((i) => i.severity >= CloudIncidentSeverity.Critical);
        const msg =
          critical.length > 0
            ? `Nueva incidencia crítica: ${critical[0].title.slice(0, 40)}${critical[0].title.length > 40 ? "…" : ""}`
            : `Nueva incidencia: ${added[0].title.slice(0, 40)}${added[0].title.length > 40 ? "…" : ""}`;
        setToast({ message: msg, severity: critical.length > 0 ? CloudIncidentSeverity.Critical : added[0].severity });
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 5000);
      }
      prevIncidentIds.current = newIds;
      if (added.length > 0) {
        setNewIncidentIds((current) => {
          const next = new Set(current);
          for (const inc of added) next.add(inc.id);
          return next;
        });
        if (newBadgeTimer.current) clearTimeout(newBadgeTimer.current);
        newBadgeTimer.current = setTimeout(() => setNewIncidentIds(new Set()), 8000);
      }
      setOverview(data);
      setLastDataRefresh(new Date());
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo cargar el centro de estado",
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeOnly, providerFilter, severityFilter]);

  async function handleManualRefresh() {
    setIsManualRefreshing(true);
    try {
      await refreshCloudStatus();
      await load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo actualizar el estado cloud",
      );
    } finally {
      setIsManualRefreshing(false);
    }
  }

  useEffect(() => {
    document.title = "Cloud Alert Hub — Centro de Estado Cloud";
    setIsLoading(true);
    void load();
    const timer = setTimeout(() => {
      void loadMsIncidents();
    }, 0);
    return () => clearTimeout(timer);
  }, [load, loadMsIncidents]);

  useEffect(() => {
    const timer = setTimeout(() => {
      getMicrosoftIntegration()
        .then((data) => setMsIntegrationConfigured(data.configured))
        .catch(() => setMsIntegrationConfigured(false));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const { state: signalrState, on } = useSignalRConnection();
  const isRealtimeConnected = signalrState === "connected";

  useEffect(() => {
    const offs: (() => void)[] = [];
    offs.push(on("CloudStatusChanged", () => void load()));
    offs.push(on("IncidentCreated", () => void load()));
    offs.push(on("IncidentUpdated", () => void load()));
    offs.push(on("IncidentResolved", () => void load()));
    offs.push(on("ProviderSynced", () => void load()));
    return () => offs.forEach((f) => f());
  }, [load, on]);

  usePolling(
    load,
    {
      intervalMs: refreshInterval,
      enabled: refreshInterval > 0,
    },
    [load, refreshInterval],
  );

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (providerFilter) params.set("provider", providerFilter);
    if (severityFilter) params.set("severity", severityFilter);
    if (activeOnly) params.set("active", "1");
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    setSearchParams(params, { replace: true });
    setCurrentPage(1);
  }, [providerFilter, severityFilter, activeOnly, dateFrom, dateTo, setSearchParams]);

  const providers = useMemo(
    () => sortProviders(overview?.providers ?? []),
    [overview?.providers],
  );
  const summary = overview?.summary;

  const unifiedIncidents = useMemo(() => {
    const cloud: UnifiedIncident[] = (overview?.incidents ?? []).map((i) => ({
      type: "cloud" as const,
      data: i,
    }));
    const ms: UnifiedIncident[] = msIncidents.map((i) => ({
      type: "microsoft" as const,
      data: i,
    }));
    let all = [...cloud, ...ms];

    if (providerFilter) {
      all = all.filter(
        (i) => i.type === "cloud" && i.data.providerSlug === providerFilter,
      );
    }
    if (severityFilter) {
      const filterNum = Number(severityFilter);
      all = all.filter((i) => {
        const sev =
          i.type === "cloud"
            ? i.data.severity
            : (i.data.severity as CloudIncidentSeverity);
        return sev === filterNum;
      });
    }
    if (activeOnly) {
      all = all.filter((i) => i.data.isActive);
    }
    if (dateFrom) {
      const fromMs = new Date(dateFrom).getTime();
      all = all.filter((i) => new Date(i.data.occurredAt).getTime() >= fromMs);
    }
    if (dateTo) {
      const toMs = new Date(dateTo).getTime();
      all = all.filter((i) => new Date(i.data.occurredAt).getTime() <= toMs);
    }

    all.sort(
      (a, b) =>
        new Date(b.data.occurredAt).getTime() -
        new Date(a.data.occurredAt).getTime(),
    );
    return all;
  }, [
    overview,
    msIncidents,
    providerFilter,
    severityFilter,
    activeOnly,
    dateFrom,
    dateTo,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(unifiedIncidents.length / INCIDENTS_PER_PAGE),
  );
  const paginated = unifiedIncidents.slice(
    (currentPage - 1) * INCIDENTS_PER_PAGE,
    currentPage * INCIDENTS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [providerFilter, severityFilter, activeOnly, dateFrom, dateTo]);

  function handleTranslationLoaded(
    incidentId: string,
    translation: CloudIncidentTranslationDto,
  ) {
    setTranslationCache((current) => ({
      ...current,
      [incidentId]: translation,
    }));
  }

  return (
    <div className="space-y-6">
      {/* New incident toast */}
      {toast && (
        <div className="fixed right-4 top-4 z-50 animate-toast-in">
          <div
            className={`flex max-w-sm items-center gap-3 rounded-lg border px-4 py-3 shadow-lg ${
              toast.severity >= CloudIncidentSeverity.Critical
                ? "border-red-900/40 bg-red-950/90 text-red-200"
                : toast.severity >= CloudIncidentSeverity.Major
                  ? "border-orange-900/40 bg-orange-950/90 text-orange-200"
                  : "border-blue-900/40 bg-blue-950/90 text-blue-200"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                toast.severity >= CloudIncidentSeverity.Critical
                  ? "bg-red-500"
                  : toast.severity >= CloudIncidentSeverity.Major
                    ? "bg-orange-500"
                    : "bg-blue-500"
              }`}
            />
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-2 text-xs opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${isRealtimeConnected ? "bg-emerald-500" : "bg-slate-400 animate-pulse"}`}
            />
            <span className="text-xs text-slate-400">
              {isRealtimeConnected
                ? `Realtime activo — última sinc. ${lastDataRefresh?.toLocaleTimeString("es-PE", { timeZone: "America/Lima" }) ?? "—"}`
                : signalrState === "reconnecting"
                  ? "Reconectando SignalR..."
                  : `Fallback con polling — última sinc. ${lastDataRefresh?.toLocaleTimeString("es-PE", { timeZone: "America/Lima" }) ?? "—"}`}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-100">
            Centro de Estado Cloud
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Observabilidad del ecosistema cloud con inteligencia de incidentes
            en tiempo casi real para proveedores críticos.
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 text-xs text-slate-400 sm:items-end sm:text-right">
          <div>
            <div>Refresco automático</div>
            <select
              className="mt-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-300"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
            >
              {REFRESH_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <Button
            variant="secondary"
            onClick={handleManualRefresh}
            isLoading={isManualRefreshing}
          >
            Actualizar ahora
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-900/30 bg-red-950/40 p-6 text-center">
          <h3 className="text-sm font-semibold text-red-200">No se pudo cargar el Centro de Estado Cloud</h3>
          <p className="mt-1 text-sm text-red-300/80">{error}</p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setIsLoading(true);
              void load();
            }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-500"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7m0 0l3.181 3.182" />
            </svg>
            Reintentar
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de proveedores"
          value={isLoading ? "—" : (summary?.totalProviders ?? 0)}
          subtitle="Feeds cloud activos"
          tone="neutral"
        />
        <StatCard
          title="Incidentes activos"
          value={isLoading ? "—" : (summary?.activeIncidents ?? 0)}
          subtitle="Eventos abiertos o en monitoreo"
          tone={(summary?.activeIncidents ?? 0) > 0 ? "warning" : "success"}
        />
        <StatCard
          title="Caídas críticas"
          value={isLoading ? "—" : (summary?.criticalOutages ?? 0)}
          subtitle="Impacto severo detectado"
          tone={(summary?.criticalOutages ?? 0) > 0 ? "danger" : "success"}
        />
        <StatCard
          title="Servicios operativos"
          value={isLoading ? "—" : (summary?.operationalServices ?? 0)}
          subtitle={
            summary?.lastUpdatedAt
              ? relativeFreshness(summary.lastUpdatedAt)
              : "Esperando primera sincronización"
          }
          tone="success"
        />
      </div>

      {/* Resumen operativo NOC */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">Resumen operativo NOC</h2>
          <Clock />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <div className="rounded-xl bg-slate-900/60 p-4 text-center ring-1 ring-slate-800">
            <p className="text-xs uppercase tracking-wider text-slate-500">Operatividad actual</p>
            <p className={`mt-2 text-3xl font-bold ${(summary?.operationalServices ?? 0) > 0 ? "text-emerald-400" : "text-slate-400"}`}>
              {isLoading ? "—" : `${Math.round(((summary?.operationalServices ?? 0) / Math.max((summary?.totalProviders ?? 1), 1)) * 100)}%`}
            </p>
          </div>
          <div className="rounded-xl bg-slate-900/60 p-4 text-center ring-1 ring-slate-800">
            <p className="text-xs uppercase tracking-wider text-slate-500">Crítico</p>
            <p className="mt-2 text-3xl font-bold text-red-400">
              {isLoading ? "—" : (overview?.incidents ?? []).filter((i) => i.severity === 3 && i.isActive).length}
            </p>
          </div>
          <div className="rounded-xl bg-slate-900/60 p-4 text-center ring-1 ring-slate-800">
            <p className="text-xs uppercase tracking-wider text-slate-500">Mayor</p>
            <p className="mt-2 text-3xl font-bold text-orange-400">
              {isLoading ? "—" : (overview?.incidents ?? []).filter((i) => i.severity === 2 && i.isActive).length}
            </p>
          </div>
          <div className="rounded-xl bg-slate-900/60 p-4 text-center ring-1 ring-slate-800">
            <p className="text-xs uppercase tracking-wider text-slate-500">Menor</p>
            <p className="mt-2 text-3xl font-bold text-yellow-400">
              {isLoading ? "—" : (overview?.incidents ?? []).filter((i) => i.severity === 1 && i.isActive).length}
            </p>
          </div>
          <div className="rounded-xl bg-slate-900/60 p-4 text-center ring-1 ring-slate-800">
            <p className="text-xs uppercase tracking-wider text-slate-500">Providers afectados</p>
            <p className="mt-2 text-3xl font-bold text-blue-400">
              {isLoading ? "—" : new Set((overview?.incidents ?? []).filter((i) => i.isActive).map((i) => i.providerName)).size}
            </p>
          </div>
        </div>
      </div>

      <Card title="Filtros" className="border-slate-800">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-300">Proveedor</span>
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
            >
              <option value="">Todos los proveedores</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.slug}>
                  {provider.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-300">Severidad</span>
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              {severityFilterOptions().map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-300">Desde</span>
            <input
              type="date"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-300">Hasta</span>
            <input
              type="date"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </label>

          <label className="flex items-end gap-3 rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm text-slate-300">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-700"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
            />
            <span>
              <span className="block font-medium">Solo activos</span>
              <span className="text-xs text-slate-400">
                Oculta incidentes resueltos
              </span>
            </span>
          </label>

          <div className="rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm text-slate-300">
            <div className="font-medium">Contexto actual</div>
            <div className="mt-1 text-xs text-slate-500">
              {unifiedIncidents.length} incidencias en la vista actual
            </div>
          </div>
        </div>
      </Card>

      <Card
        title="Proveedores cloud"
        right={
          <span className="text-xs text-slate-400">Salud del ecosistema</span>
        }
      >
        {providers.length === 0 && !isLoading ? (
          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-400">
            Todavía no hay proveedores sincronizados.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {providers.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                msIntegrationConfigured={msIntegrationConfigured}
              />
            ))}
          </div>
        )}
      </Card>

      <Card
        title="Timeline de incidentes"
        right={
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  viewMode === "list"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:bg-slate-900/40"
                }`}
              >
                Lista
              </button>
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  viewMode === "map"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:bg-slate-900/40"
                }`}
              >
                Mapa
              </button>
            </div>
            <span className="text-xs text-slate-400">
              {unifiedIncidents.length} elementos
            </span>
          </div>
        }
      >
        {msError && (
          <div className="mb-3 rounded-md border border-amber-900/30 bg-amber-900/20 px-4 py-2 text-xs text-amber-300">
            Microsoft 365: {msError}
          </div>
        )}
        {isLoading || msLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-xl border border-slate-800 p-4"
              >
                <div className="h-4 w-48 rounded bg-slate-700"></div>
                <div className="mt-3 h-3 w-full rounded bg-slate-800"></div>
                <div className="mt-2 h-3 w-5/6 rounded bg-slate-800"></div>
              </div>
            ))}
          </div>
        ) : unifiedIncidents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center">
            <div className="text-sm font-medium text-slate-300">
              No hay incidentes para los filtros actuales
            </div>
            <div className="mt-1 text-sm text-slate-400">
              Ajusta proveedor, severidad o el filtro de activos para ampliar el
              contexto.
            </div>
          </div>
        ) : viewMode === "map" ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-1">
            <CloudRegionMap
              incidents={unifiedIncidents.map((i) => ({
                id: i.data.id,
                title: i.data.title,
                description: i.data.description,
                severity:
                  i.type === "cloud"
                    ? i.data.severity
                    : (i.data.severity as number),
                status:
                  i.type === "cloud"
                    ? i.data.status
                    : (i.data.status as CloudIncidentStatus),
                region: i.data.region ?? null,
                isActive: i.data.isActive,
                occurredAt: i.data.occurredAt,
                lastUpdatedAt: i.data.lastUpdatedAt,
                providerName:
                  i.type === "cloud" ? i.data.providerName : "Microsoft 365",
                providerLogoUrl:
                  i.type === "cloud" ? i.data.providerLogoUrl : "",
              }))}
              onRegionClick={(region) => setSelectedRegion(region)}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {paginated.map((item, index) => (
              <div
                key={item.data.id}
                className="animate-slide-in opacity-0"
                style={{
                  animationDelay: `${index * 60}ms`,
                  animationFillMode: "forwards",
                }}
              >
                {item.type === "cloud" ? (
                  <IncidentCard
                    incident={item.data}
                    cachedTranslation={translationCache[item.data.id] ?? null}
                    onTranslationLoaded={handleTranslationLoaded}
                    isNew={newIncidentIds.has(item.data.id)}
                  />
                ) : (
                  <MicrosoftIncidentCard
                    incident={item.data}
                    isNew={newIncidentIds.has(item.data.id)}
                  />
                )}
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() =>
                  exportToCSV(
                    unifiedIncidents,
                    `incidencias_cloud_${new Date().toISOString().slice(0, 10)}.csv`,
                  )
                }
                className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-900/40"
                title="Exportar incidencias filtradas a CSV"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Exportar CSV
              </button>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-900/40 disabled:opacity-40"
                  >
                    ← Anterior
                  </button>
                  <span className="text-xs text-slate-500">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    className="rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-900/40 disabled:opacity-40"
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Region detail panel */}
      {selectedRegion && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setSelectedRegion(null)}
        >
          <div
            className="fixed right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-slate-800 bg-slate-950 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-100">
                {selectedRegion.name}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedRegion(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-400"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                <div className="text-2xl font-bold text-slate-100">
                  {selectedRegion.totalIncidents}
                </div>
                <div className="text-xs text-slate-400">Total incidencias</div>
              </div>
              <div className="rounded-xl border border-amber-900/30 bg-amber-900/20 p-3">
                <div className="text-2xl font-bold text-amber-300">
                  {selectedRegion.activeIncidents}
                </div>
                <div className="text-xs text-amber-400">Activas</div>
              </div>
            </div>

            <div className="mb-4 rounded-lg border border-slate-800 bg-slate-950 p-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Proveedores afectados
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(selectedRegion.providers).map((p) => (
                  <span
                    key={p}
                    className="rounded-full bg-blue-900/20 px-2.5 py-1 text-xs font-medium text-blue-300"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Incidencias en esta región
            </div>
            <div className="space-y-3">
              {selectedRegion.incidents
                .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
                .map((incident) => (
                  <div
                    key={incident.id}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <CloudProviderAvatar
                        name={incident.providerName}
                        logoUrl={incident.providerLogoUrl ?? ""}
                        sizeClassName="h-7 w-7"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-100">
                          {incident.providerName}
                        </div>
                        <div className="text-xs text-slate-400">
                          {formatDateTime(incident.occurredAt)}
                        </div>
                      </div>
                      <CloudIncidentSeverityBadge severity={incident.severity as CloudIncidentSeverity} />
                    </div>
                    <div className="mt-2 text-sm text-slate-300 line-clamp-2">
                      {incident.title}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {incident.isActive ? "Activa" : "Resuelta"} ·{" "}
                      {cloudIncidentStatusLabel(incident.status)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

type ProviderCardProps = {
  provider: CloudProviderDto;
  msIntegrationConfigured: boolean | null;
};

function ProviderCard({
  provider,
  msIntegrationConfigured,
}: ProviderCardProps) {
  const isMsProvider =
    provider.sourceType === CloudStatusSourceType.MicrosoftGraphServiceHealth;
  const needsConfig = isMsProvider && msIntegrationConfigured === false;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <CloudProviderAvatar name={provider.name} logoUrl={provider.logoUrl} />
        <div className="min-w-0">
          <div className="truncate font-medium text-slate-100">
            {provider.name}
          </div>
          <div className="text-xs text-slate-400">
            {needsConfig
              ? "Integración pendiente"
              : `${provider.activeIncidents} incidentes activos`}
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span
          className={[
            "inline-flex items-center rounded-full px-2 py-0.5 font-medium",
            needsConfig
              ? "bg-orange-900/20 text-orange-300"
              : provider.activeIncidents > 0
                ? provider.activeIncidents > 1
                  ? "bg-red-900/20 text-red-300"
                  : "bg-amber-900/20 text-amber-300"
                : "bg-emerald-900/20 text-emerald-300",
          ].join(" ")}
        >
          {needsConfig
            ? "Requiere integración"
            : provider.activeIncidents > 0
              ? "Con incidentes"
              : "Operativo"}
        </span>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 font-medium text-slate-300">
          {cloudStatusSourceTypeLabel(provider.sourceType)}
        </span>
      </div>
      <div className="mt-2 text-xs text-slate-400">
        {needsConfig
          ? "Agrega tu tenant en Integraciones para ver incidencias."
          : relativeFreshness(provider.lastSyncedAt)}
      </div>
      {needsConfig ? (
        <a
          href="#/integrations"
          className="mt-3 inline-flex text-xs font-medium text-blue-600 hover:text-blue-300"
        >
          Ir a Integraciones →
        </a>
      ) : provider.statusPageUrl ? (
        <a
          href={provider.statusPageUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex text-xs font-medium text-blue-600 hover:text-blue-300"
        >
          Ver estado oficial →
        </a>
      ) : null}
    </div>
  );
}

type IncidentCardProps = {
  incident: CloudIncidentDto;
  cachedTranslation: CloudIncidentTranslationDto | null;
  onTranslationLoaded: (
    incidentId: string,
    translation: CloudIncidentTranslationDto,
  ) => void;
  isNew?: boolean;
};

function IncidentCard({
  incident,
  cachedTranslation,
  onTranslationLoaded,
  isNew,
}: IncidentCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [localTranslation, setLocalTranslation] =
    useState<CloudIncidentTranslationDto | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslated, setShowTranslated] = useState(
    Boolean(cachedTranslation),
  );

  const translation = localTranslation ?? cachedTranslation ?? null;

  async function handleTranslate() {
    if (translation) {
      setShowTranslated((current) => !current);
      setDetailsOpen(true);
      return;
    }

    setDetailsOpen(true);
    setIsTranslating(true);
    setTranslationError(null);

    try {
      const result = await translateCloudIncident({
        incidentId: incident.id,
        title: incident.title,
        description: incident.description,
      });
      setLocalTranslation(result);
      setTranslationError(null);
      setShowTranslated(true);
      onTranslationLoaded(incident.id, result);
    } catch (e) {
      setTranslationError(
        e instanceof Error && e.message
          ? e.message
          : "No se pudo traducir el incidente en este momento. Intenta nuevamente más tarde.",
      );
    } finally {
      setIsTranslating(false);
    }
  }

  const translationSectionTitle = showTranslated
    ? "Traducción al español"
    : "Vista original";
  const translationButtonLabel = translation
    ? showTranslated
      ? "Ver original"
      : "Ver traducción"
    : "Traducir al español";
  const displayedTitle =
    translation && showTranslated
      ? translation.translatedTitle
      : incident.title;
  const displayedDescription =
    translation && showTranslated
      ? translation.translatedDescription ||
        "Sin contenido traducido adicional."
      : incident.description;
  const translationStatusBadge = isTranslating ? (
    <span className="rounded-full border border-blue-900/30 bg-blue-900/20 px-3 py-1 text-xs font-semibold text-blue-300 animate-pulse">
      Traduciendo...
    </span>
  ) : translationError ? (
    <span className="rounded-full border border-red-900/30 bg-red-900/20 px-3 py-1 text-xs font-semibold text-red-300">
      Error al traducir
    </span>
  ) : translation ? (
    <span className="rounded-full border border-emerald-900/30 bg-emerald-900/20 px-3 py-1 text-xs font-semibold text-emerald-300">
      Traducido
    </span>
  ) : null;

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <CloudProviderAvatar
              name={incident.providerName}
              logoUrl={incident.providerLogoUrl}
              sizeClassName="h-9 w-9"
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-100">
                {incident.providerName}
              </div>
              <div className="text-xs text-slate-400">
                {formatDateTime(incident.lastUpdatedAt)}
              </div>
            </div>
            <CloudDisplayStatusBadge label={incident.displayStatus} />
            <CloudIncidentSeverityBadge severity={incident.severity} />
            <CloudIncidentStatusBadge status={incident.status} />
            {isNew ? (
              <span className="rounded-full border border-violet-900/30 bg-violet-900/20 px-3 py-1 text-xs font-semibold text-violet-300 animate-pulse">
                Nuevo
              </span>
            ) : null}
          </div>

          <h3 className="mt-4 text-lg font-semibold text-slate-100">
            {incident.title}
          </h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-400">
            {incident.description}
          </p>
        </div>

        <div className="w-full max-w-xs rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Incident intelligence
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <MetaItem
              label="Región"
              value={incident.region ?? "No especificada"}
            />
            <MetaItem label="Fuente" value={incident.source} />
            <MetaItem label="Activo" value={incident.isActive ? "Sí" : "No"} />
            <MetaItem
              label="Inicio"
              value={formatDateTime(incident.occurredAt)}
            />
          </dl>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {incident.affectedServices.length > 0 ? (
          incident.affectedServices.map((service) => (
            <span
              key={service}
              className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300"
            >
              {service}
            </span>
          ))
        ) : (
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-500">
            Sin servicios afectados especificados
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4 text-sm">
        <div className="text-slate-400">
          {incident.resolvedAt
            ? `Resuelto: ${formatDateTime(incident.resolvedAt)}`
            : "En seguimiento"}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {translationStatusBadge}
          <Button
            variant="secondary"
            onClick={() => setDetailsOpen((current) => !current)}
          >
            {detailsOpen ? "Ocultar detalles" : "Ver detalles"}
          </Button>
          <Button
            variant="secondary"
            onClick={handleTranslate}
            isLoading={isTranslating}
          >
            {translationButtonLabel}
          </Button>
          <a
            href={incident.officialUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-blue-600 hover:text-blue-300"
          >
            Abrir fuente oficial →
          </a>
        </div>
      </div>

      <div
        className={[
          "overflow-hidden transition-all duration-500 ease-in-out",
          detailsOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0",
        ].join(" ")}
      >
        <div className="mt-4 grid grid-cols-1 gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 lg:grid-cols-2">
          <section className="space-y-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Detalle original
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-100">
                {incident.title}
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-300">
                {incident.description}
              </p>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Metadatos del incidente
              </div>
              <dl className="mt-2 space-y-2 text-sm">
                <MetaItem label="Proveedor" value={incident.providerName} />
                <MetaItem
                  label="Estado visual"
                  value={incident.displayStatus}
                />
                <MetaItem
                  label="Última actualización"
                  value={formatDateTime(incident.lastUpdatedAt)}
                />
                <MetaItem
                  label="Detectado"
                  value={formatDateTime(incident.occurredAt)}
                />
                <MetaItem
                  label="Resolución"
                  value={
                    incident.resolvedAt
                      ? formatDateTime(incident.resolvedAt)
                      : "Aún activo"
                  }
                />
              </dl>
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {translationSectionTitle}
                </div>
                {translation ? (
                  <button
                    type="button"
                    onClick={() => setShowTranslated((current) => !current)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-300"
                  >
                    {showTranslated ? "Ver original" : "Ver traducción"}
                  </button>
                ) : null}
              </div>
              {translation ? (
                <>
                  <div className="mt-2 text-sm font-semibold text-slate-100">
                    {displayedTitle}
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-300">
                    {displayedDescription}
                  </p>
                </>
              ) : isTranslating ? (
                <div className="mt-2 rounded-xl border border-blue-900/30 bg-blue-900/20 px-3 py-4 text-sm text-blue-300 animate-pulse">
                  Traduciendo...
                </div>
              ) : (
                <div className="mt-2 rounded-xl border border-dashed border-slate-700 bg-slate-950 px-3 py-4 text-sm text-slate-500">
                  Usa el botón{" "}
                  <span className="font-medium text-slate-300">
                    Traducir al español
                  </span>{" "}
                  para ver este incidente traducido aquí mismo.
                </div>
              )}
              {translationError ? (
                <div className="mt-3 rounded-md border border-red-900/30 bg-red-900/20 px-3 py-2 text-xs text-red-300">
                  {translationError}
                </div>
              ) : null}
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Servicios afectados
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {incident.affectedServices.length > 0 ? (
                  incident.affectedServices.map((service) => (
                    <span
                      key={service}
                      className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-slate-300 ring-1 ring-slate-700"
                    >
                      {service}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">
                    Sin servicios afectados especificados.
                  </span>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </article>
  );
}

type MetaItemProps = {
  label: string;
  value: string;
};

function MetaItem({ label, value }: MetaItemProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}

type MicrosoftIncidentCardProps = {
  incident: MicrosoftGraphIncident;
  isNew?: boolean;
};

function MicrosoftIncidentCard({ incident, isNew }: MicrosoftIncidentCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [localTranslation, setLocalTranslation] =
    useState<CloudIncidentTranslationDto | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslated, setShowTranslated] = useState(false);

  async function handleTranslate() {
    if (localTranslation) {
      setShowTranslated((current) => !current);
      setDetailsOpen(true);
      return;
    }

    setDetailsOpen(true);
    setIsTranslating(true);
    setTranslationError(null);

    try {
      const result = await translateCloudIncident({
        incidentId: incident.id,
        title: incident.title,
        description: incident.description,
      });
      setLocalTranslation(result);
      setShowTranslated(true);
    } catch (e) {
      setTranslationError(
        e instanceof Error && e.message
          ? e.message
          : "No se pudo traducir el incidente en este momento. Intenta nuevamente más tarde.",
      );
    } finally {
      setIsTranslating(false);
    }
  }

  const translationSectionTitle = showTranslated
    ? "Traducción al español"
    : "Vista original";
  const translationButtonLabel = localTranslation
    ? showTranslated
      ? "Ver original"
      : "Ver traducción"
    : "Traducir al español";
  const displayedTitle =
    localTranslation && showTranslated
      ? localTranslation.translatedTitle
      : incident.title;
  const displayedDescription =
    localTranslation && showTranslated
      ? localTranslation.translatedDescription ||
        "Sin contenido traducido adicional."
      : incident.description;

  const translationStatusBadge = isTranslating ? (
    <span className="rounded-full border border-blue-900/30 bg-blue-900/20 px-3 py-1 text-xs font-semibold text-blue-300 animate-pulse">
      Traduciendo...
    </span>
  ) : translationError ? (
    <span className="rounded-full border border-red-900/30 bg-red-900/20 px-3 py-1 text-xs font-semibold text-red-300">
      Error al traducir
    </span>
  ) : localTranslation ? (
    <span className="rounded-full border border-emerald-900/30 bg-emerald-900/20 px-3 py-1 text-xs font-semibold text-emerald-300">
      Traducido
    </span>
  ) : null;

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <CloudProviderAvatar
              name="Microsoft 365"
              logoUrl="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg"
              sizeClassName="h-9 w-9"
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-100">
                Microsoft 365
              </div>
              <div className="text-xs text-slate-400">
                {formatDateTime(incident.lastUpdatedAt)}
              </div>
            </div>
            <CloudIncidentSeverityBadge
              severity={incident.severity as CloudIncidentSeverity}
            />
            <CloudIncidentStatusBadge
              status={incident.status as CloudIncidentStatus}
            />
            {isNew ? (
              <span className="rounded-full border border-violet-900/30 bg-violet-900/20 px-3 py-1 text-xs font-semibold text-violet-300 animate-pulse">
                Nuevo
              </span>
            ) : null}
          </div>

          <h3 className="mt-4 text-lg font-semibold text-slate-100">
            {incident.title}
          </h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-400">
            {incident.description}
          </p>
        </div>

        <div className="w-full max-w-xs rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Incident intelligence
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <MetaItem
              label="Región"
              value={incident.region ?? "No especificada"}
            />
            <MetaItem label="Fuente" value="Microsoft Graph Service Health" />
            <MetaItem label="Activo" value={incident.isActive ? "Sí" : "No"} />
            <MetaItem
              label="Inicio"
              value={formatDateTime(incident.occurredAt)}
            />
          </dl>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {incident.affectedServices.length > 0 ? (
          incident.affectedServices.map((service) => (
            <span
              key={service}
              className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300"
            >
              {service}
            </span>
          ))
        ) : (
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-500">
            Sin servicios afectados especificados
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4 text-sm">
        <div className="text-slate-400">
          {incident.resolvedAt
            ? `Resuelto: ${formatDateTime(incident.resolvedAt)}`
            : "En seguimiento"}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {translationStatusBadge}
          <Button
            variant="secondary"
            onClick={() => setDetailsOpen((current) => !current)}
          >
            {detailsOpen ? "Ocultar detalles" : "Ver detalles"}
          </Button>
          <Button
            variant="secondary"
            onClick={handleTranslate}
            isLoading={isTranslating}
          >
            {translationButtonLabel}
          </Button>
          <a
            href={incident.officialUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-blue-600 hover:text-blue-300"
          >
            Abrir fuente oficial →
          </a>
        </div>
      </div>

      <div
        className={[
          "overflow-hidden transition-all duration-500 ease-in-out",
          detailsOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0",
        ].join(" ")}
      >
        <div className="mt-4 grid grid-cols-1 gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 lg:grid-cols-2">
          <section className="space-y-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Detalle original
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-100">
                {incident.title}
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-300">
                {incident.description}
              </p>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Metadatos del incidente
              </div>
              <dl className="mt-2 space-y-2 text-sm">
                <MetaItem label="ID externo" value={incident.id} />
                <MetaItem
                  label="Estado"
                  value={cloudIncidentStatusLabel(incident.status as CloudIncidentStatus)}
                />
                <MetaItem
                  label="Severidad"
                  value={cloudIncidentSeverityLabel(incident.severity as CloudIncidentSeverity)}
                />
                <MetaItem
                  label="Última actualización"
                  value={formatDateTime(incident.lastUpdatedAt)}
                />
                <MetaItem
                  label="Detectado"
                  value={formatDateTime(incident.occurredAt)}
                />
                <MetaItem
                  label="Resolución"
                  value={
                    incident.resolvedAt
                      ? formatDateTime(incident.resolvedAt)
                      : "Aún activo"
                  }
                />
              </dl>
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {translationSectionTitle}
                </div>
                {localTranslation ? (
                  <button
                    type="button"
                    onClick={() => setShowTranslated((current) => !current)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-300"
                  >
                    {showTranslated ? "Ver original" : "Ver traducción"}
                  </button>
                ) : null}
              </div>
              {localTranslation ? (
                <>
                  <div className="mt-2 text-sm font-semibold text-slate-100">
                    {displayedTitle}
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-300">
                    {displayedDescription}
                  </p>
                </>
              ) : isTranslating ? (
                <div className="mt-2 rounded-xl border border-blue-900/30 bg-blue-900/20 px-3 py-4 text-sm text-blue-300 animate-pulse">
                  Traduciendo...
                </div>
              ) : (
                <div className="mt-2 rounded-xl border border-dashed border-slate-700 bg-slate-950 px-3 py-4 text-sm text-slate-500">
                  Usa el botón{" "}
                  <span className="font-medium text-slate-300">
                    Traducir al español
                  </span>{" "}
                  para ver este incidente traducido aquí mismo.
                </div>
              )}
              {translationError ? (
                <div className="mt-3 rounded-md border border-red-900/30 bg-red-900/20 px-3 py-2 text-xs text-red-300">
                  {translationError}
                </div>
              ) : null}
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Servicios afectados
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {incident.affectedServices.length > 0 ? (
                  incident.affectedServices.map((service) => (
                    <span
                      key={service}
                      className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-slate-300 ring-1 ring-slate-700"
                    >
                      {service}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">
                    Sin servicios afectados especificados.
                  </span>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </article>
  );
}
