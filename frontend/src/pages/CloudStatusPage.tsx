import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { CloudRegionMap, type RegionStats } from "../components/CloudRegionMap";
import { CloudIncidentSeverityBadge } from "../components/CloudIncidentSeverityBadge";
import { CloudProviderAvatar } from "../components/CloudProviderAvatar";
import { usePolling } from "../hooks/usePolling";
import {
  getCloudStatusOverview,
  getProviderTrends,
  refreshCloudStatus,
  resetAndIngestCloudStatus,
} from "../services/cloudStatus";
import {
  getMicrosoftGraphIncidents,
  getMicrosoftIntegration,
  type MicrosoftGraphIncident,
} from "../services/microsoftIntegration";
import { useSignalRConnection } from "../hooks/useSignalRConnection";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { Clock } from "../components/cloud/Clock";
import { GlobalStatusBar } from "../components/cloud/GlobalStatusBar";
import { ProviderCard } from "../components/cloud/ProviderCard";
import { IncidentCard } from "../components/cloud/IncidentCard";
import { IncidentDetailModal } from "../components/cloud/IncidentDetailModal";
import { formatDateTime, groupByDate } from "../utils/cloudStatus";
import {
  CloudIncidentSeverity,
  cloudIncidentSeverityLabel,
  cloudIncidentStatusLabel,
  type CloudIncidentDto,
  type CloudIncidentStatus,
  type CloudIncidentTranslationDto,
  type CloudProviderDto,
  type CloudProviderTrendDto,
  type CloudStatusOverviewDto,
} from "../types/cloudStatus";

const REFRESH_OPTIONS = [
  { label: "Manual", value: 0 },
  { label: "15s", value: 15_000 },
  { label: "30s", value: 30_000 },
  { label: "1m", value: 60_000 },
];
const PAGE_SIZE = 80;

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
  return [...providers].sort((a, b) => {
    // Priorizar proveedores con más incidentes activos
    if (b.activeIncidents !== a.activeIncidents) {
      return b.activeIncidents - a.activeIncidents;
    }
    return a.name.localeCompare(b.name);
  });
}

type UnifiedIncident =
  | { type: "cloud"; data: CloudIncidentDto }
  | { type: "microsoft"; data: MicrosoftGraphIncident };

function RefreshCountdown({
  intervalMs,
  lastRefreshAt,
}: {
  intervalMs: number;
  lastRefreshAt: Date | null;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);
  if (intervalMs <= 0) {
    return (
      <span className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 py-1 text-[10px] text-slate-500 tabular-nums">
        Manual
      </span>
    );
  }
  const elapsed = lastRefreshAt ? Date.now() - lastRefreshAt.getTime() + tick * 0 : intervalMs;
  const remaining = Math.max(0, intervalMs - elapsed);
  const sec = Math.ceil(remaining / 1000);
  return (
    <span className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 py-1 text-[10px] text-slate-500 tabular-nums">
      Próx: {sec}s
    </span>
  );
}

function ProviderFilterChips({
  providers,
  selected,
  onChange,
}: {
  providers: { id: string; name: string; slug: string }[];
  selected: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {providers.map((p) => {
        const isActive = selected.includes(p.slug);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              if (isActive) {
                onChange(selected.filter((s) => s !== p.slug));
              } else {
                onChange([...selected, p.slug]);
              }
            }}
            className={
              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors " +
              (isActive
                ? "border-slate-300 dark:border-slate-600 bg-slate-700 text-white"
                : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-800 dark:text-slate-200")
            }
            title={isActive ? "Quitar filtro" : "Filtrar por " + p.name}
          >
            {p.name}
          </button>
        );
      })}
      {selected.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="rounded-full border border-red-900/40 bg-red-900/20 px-2.5 py-1 text-[11px] font-medium text-red-300 hover:bg-red-900/30"
          title="Limpiar filtros de proveedor"
        >
          × Limpiar
        </button>
      )}
    </div>
  );
}

export function CloudStatusPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [overview, setOverview] = useState<CloudStatusOverviewDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialProviders = useMemo(() => {
    const raw = searchParams.get("provider");
    if (!raw) return [];
    return raw.split(",").map(s => s.trim()).filter(Boolean);
  }, [searchParams]);
  const [rawProviderFilter, setProviderFilter] = useLocalStorage<string[] | unknown>("cs-filter-providers-v2", initialProviders);
  const providerFilter = useMemo(() => {
    if (Array.isArray(rawProviderFilter)) return rawProviderFilter;
    if (typeof rawProviderFilter === "string" && rawProviderFilter) return [rawProviderFilter];
    return [];
  }, [rawProviderFilter]);
  const [severityFilter, setSeverityFilter] = useLocalStorage("cs-filter-severity", searchParams.get("severity") ?? "");
  const [activeOnly, setActiveOnly] = useLocalStorage("cs-filter-active", searchParams.get("active") === "1");
  const [dateFrom, setDateFrom] = useLocalStorage("cs-filter-from", searchParams.get("from") ?? "");
  const [dateTo, setDateTo] = useLocalStorage("cs-filter-to", searchParams.get("to") ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [quickFilter, setQuickFilter] = useLocalStorage<"all" | "active" | "critical" | "resolved-today">("cs-quick-filter", "all");
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [viewMode, setViewMode] = useLocalStorage<"list" | "map">("cs-viewmode", "list");
  const [denseMode, setDenseMode] = useLocalStorage("cs-dense-mode", false);
  const [selectedRegion, setSelectedRegion] = useState<RegionStats | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<{
    variant: "cloud" | "microsoft";
    incident: CloudIncidentDto | MicrosoftGraphIncident;
    cachedTranslation?: CloudIncidentTranslationDto | null;
  } | null>(null);
  const [highlightedIncidentId, setHighlightedIncidentId] = useState<string | null>(null);
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
  const [providerTrends, setProviderTrends] = useState<CloudProviderTrendDto[]>([]);
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
      const [data, trends] = await Promise.all([
        getCloudStatusOverview({
          severity: severityFilter ? Number(severityFilter) : undefined,
          activeOnly,
          take: PAGE_SIZE,
        }),
        getProviderTrends(14),
      ]);
      setProviderTrends(trends);
      // Debug: log real dates from backend to verify parsing
      if (data.incidents.length > 0) {
        console.log("[CloudStatus] Sample incident dates from backend:",
          data.incidents.slice(0, 3).map(i => ({
            title: i.title.slice(0, 30),
            occurredAt: i.occurredAt,
            lastUpdatedAt: i.lastUpdatedAt,
            resolvedAt: i.resolvedAt,
          })));
      }
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
  }, [activeOnly, severityFilter]);

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

  async function handleResetAndIngest() {
    if (!window.confirm("Esto borrará TODOS los incidentes cloud guardados y los volverá a descargar desde cada proveedor. ¿Continuar?")) {
      return;
    }
    setIsResetting(true);
    try {
      const result = await resetAndIngestCloudStatus();
      setToast({
        severity: CloudIncidentSeverity.Informational,
        message: `Re-ingestión completa: ${result.deletedIncidents} incidentes borrados y re-descargados.`,
      });
      await load();
    } catch {
      setToast({
        severity: CloudIncidentSeverity.Critical,
        message: "Error al re-ingestar. Revisa la consola del backend.",
      });
    } finally {
      setIsResetting(false);
    }
  }

  // Auto-scroll + highlight incident from notification bell query param
  const incidentIdFromUrl = searchParams.get("incidentId");
  const lastAutoScrolledIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!incidentIdFromUrl || lastAutoScrolledIdRef.current === incidentIdFromUrl) return;

    const allIncidents: UnifiedIncident[] = [
      ...(overview?.incidents ?? []).map((i) => ({ type: "cloud" as const, data: i })),
      ...(msIncidents ?? []).map((i) => ({ type: "microsoft" as const, data: i })),
    ];

    const found = allIncidents.find((i) => i.data.id === incidentIdFromUrl);
    if (found) {
      lastAutoScrolledIdRef.current = incidentIdFromUrl;
      setHighlightedIncidentId(found.data.id);

      // Scroll to the incident card in the timeline
      setTimeout(() => {
        const el = document.getElementById(`incident-${found.data.id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);

      // After highlighting, open the detail modal
      setTimeout(() => {
        setSelectedIncident({
          variant: found.type,
          incident: found.data,
          cachedTranslation: translationCache[found.data.id] ?? null,
        });
      }, 900);

      // Remove highlight after 6 seconds
      setTimeout(() => {
        setHighlightedIncidentId(null);
      }, 6000);

      // Clean URL param without reloading
      const params = new URLSearchParams(searchParams);
      params.delete("incidentId");
      setSearchParams(params, { replace: true });
    }
  }, [incidentIdFromUrl, overview, msIncidents, translationCache, searchParams, setSearchParams]);

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
    if (providerFilter.length > 0) params.set("provider", providerFilter.join(","));
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

  const baseFiltered = useMemo(() => {
    const cloud: UnifiedIncident[] = (overview?.incidents ?? []).map((i) => ({
      type: "cloud" as const,
      data: i,
    }));
    const ms: UnifiedIncident[] = msIncidents.map((i) => ({
      type: "microsoft" as const,
      data: i,
    }));
    let all = [...cloud, ...ms];

    if (providerFilter.length > 0) {
      all = all.filter(
        (i) => i.type === "cloud" && providerFilter.includes(i.data.providerSlug),
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
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      all = all.filter(
        (i) =>
          i.data.title.toLowerCase().includes(q) ||
          i.data.description.toLowerCase().includes(q) ||
          i.data.affectedServices.some((s) => s.toLowerCase().includes(q)),
      );
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
    searchQuery,
  ]);

  const tabCounts = useMemo(() => {
    const total = baseFiltered.length;
    const active = baseFiltered.filter((i) => i.data.isActive).length;
    const critical = baseFiltered.filter((i) => i.data.severity === CloudIncidentSeverity.Critical).length;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const resolvedToday = baseFiltered.filter(
      (i) => i.data.resolvedAt && new Date(i.data.resolvedAt).getTime() >= startOfToday.getTime(),
    ).length;
    return { total, active, critical, resolvedToday };
  }, [baseFiltered]);

  const unifiedIncidents = useMemo(() => {
    let all = [...baseFiltered];
    if (quickFilter === "active") {
      all = all.filter((i) => i.data.isActive);
    } else if (quickFilter === "critical") {
      all = all.filter((i) => i.data.severity === CloudIncidentSeverity.Critical);
    } else if (quickFilter === "resolved-today") {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      all = all.filter(
        (i) => i.data.resolvedAt && new Date(i.data.resolvedAt).getTime() >= startOfToday.getTime(),
      );
    }
    return all;
  }, [baseFiltered, quickFilter]);

  const pageSize = denseMode ? 20 : 10;
  const totalPages = Math.max(
    1,
    Math.ceil(unifiedIncidents.length / pageSize),
  );
  const paginated = unifiedIncidents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
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
        <div className="fixed right-4 top-4 z-50 max-w-sm animate-toast-in">
          <div
            className={`relative overflow-hidden rounded-lg border px-4 py-3 shadow-lg ${
              toast.severity >= CloudIncidentSeverity.Critical
                ? "border-red-900/40 bg-red-950/90 text-red-200"
                : toast.severity >= CloudIncidentSeverity.Major
                  ? "border-orange-900/40 bg-orange-950/90 text-orange-200"
                  : "border-blue-900/40 bg-blue-950/90 text-blue-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <svg
                className={`mt-0.5 h-5 w-5 shrink-0 ${
                  toast.severity >= CloudIncidentSeverity.Critical
                    ? "text-red-400"
                    : toast.severity >= CloudIncidentSeverity.Major
                      ? "text-orange-400"
                      : "text-blue-400"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
              <div className="flex-1">
                <div className="text-sm font-medium">{toast.message}</div>
                <div className="mt-1 text-[10px] opacity-70">Hace unos segundos</div>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="shrink-0 text-xs opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
            <div className="absolute bottom-0 left-0 h-0.5 bg-current opacity-30 animate-toast-progress" />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${isRealtimeConnected ? "bg-emerald-500 shadow-[0_0_6px] shadow-emerald-500/60" : "bg-amber-400 animate-pulse shadow-[0_0_6px] shadow-amber-400/60"}`}
            />
            <span className={`text-xs font-medium ${isRealtimeConnected ? "text-emerald-400" : "text-amber-400"}`}>
              {isRealtimeConnected
                ? `Push en vivo activo — datos sincronizados ${lastDataRefresh ? `a las ${lastDataRefresh.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Lima" })}` : "—"}`
                : signalrState === "reconnecting"
                  ? "Reconectando canal en vivo..."
                  : `Actualización periódica — sincronizado ${lastDataRefresh ? `a las ${lastDataRefresh.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Lima" })}` : "—"}`}
            </span>
          </div>
          <h1 className="mt-2 text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Centro de Estado Cloud
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            Observabilidad del ecosistema cloud con inteligencia de incidentes
            en tiempo casi real para proveedores críticos.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Clock />
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 py-1"
              title={isRealtimeConnected ? "Conectado en tiempo real" : "Desconectado del servidor en tiempo real"}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isRealtimeConnected ? "bg-emerald-400" : "bg-slate-600"}`} />
              <span className={isRealtimeConnected ? "text-emerald-400" : "text-slate-500"}>
                {isRealtimeConnected ? "En vivo" : "Desconectado"}
              </span>
            </span>
            <RefreshCountdown intervalMs={refreshInterval} lastRefreshAt={lastDataRefresh} />
            <select
              className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 text-xs text-slate-700 dark:text-slate-300"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              title="Refresco automático"
            >
              {REFRESH_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <Button
              variant="secondary"
              onClick={handleManualRefresh}
              isLoading={isManualRefreshing}
              className="text-xs px-2 py-1"
            >
              Actualizar
            </Button>
            <Button
              variant="secondary"
              onClick={handleResetAndIngest}
              isLoading={isResetting}
              title="Borra todos los incidentes cloud y los re-descarga con fechas reales"
              className="text-xs px-2 py-1"
            >
              Re-ingestar
            </Button>
          </div>
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

      <GlobalStatusBar summary={summary} isLoading={isLoading} />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.88-7.021A7.003 7.003 0 0015.75 7.5H15m-6 0a7.003 7.003 0 00-6.88 5.271A4.5 4.5 0 002.25 15z" /></svg>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Proveedores</p>
            {isLoading ? <div className="mt-1 h-6 w-10 animate-pulse rounded bg-slate-100 dark:bg-slate-800/50" /> : <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{summary?.totalProviders ?? 0}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3.5">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${(summary?.activeIncidents ?? 0) > 0 ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"}`}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Activos</p>
            {isLoading ? <div className="mt-1 h-6 w-10 animate-pulse rounded bg-slate-100 dark:bg-slate-800/50" /> : (
              <p className={`text-xl font-bold ${(summary?.activeIncidents ?? 0) > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>{summary?.activeIncidents ?? 0}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3.5">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${(summary?.criticalOutages ?? 0) > 0 ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400" : "bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400"}`}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Crítico</p>
            {isLoading ? <div className="mt-1 h-6 w-10 animate-pulse rounded bg-slate-100 dark:bg-slate-800/50" /> : (
              <p className={`text-xl font-bold ${(summary?.criticalOutages ?? 0) > 0 ? "text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-400"}`}>{summary?.criticalOutages ?? 0}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Mayor</p>
            {isLoading ? <div className="mt-1 h-6 w-10 animate-pulse rounded bg-slate-100 dark:bg-slate-800/50" /> : (
              <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{(overview?.incidents ?? []).filter((i) => i.severity === 2 && i.isActive).length}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-yellow-50 text-yellow-600 dark:bg-yellow-950/30 dark:text-yellow-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Menor</p>
            {isLoading ? <div className="mt-1 h-6 w-10 animate-pulse rounded bg-slate-100 dark:bg-slate-800/50" /> : (
              <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{(overview?.incidents ?? []).filter((i) => i.severity === 1 && i.isActive).length}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Operatividad</p>
            {isLoading ? <div className="mt-1 h-6 w-10 animate-pulse rounded bg-slate-100 dark:bg-slate-800/50" /> : (
              <p className={`text-xl font-bold ${(summary?.operationalServices ?? 0) > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400"}`}>{`${Math.round(((summary?.operationalServices ?? 0) / Math.max((summary?.totalProviders ?? 1), 1)) * 100)}%`}</p>
            )}
          </div>
        </div>
      </div>

      {/* Barra de filtros compacta */}
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2">
        <input
          type="text"
          placeholder="Buscar incidente..."
          className="w-full sm:w-auto rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-600"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          title="Buscar"
        />
        <ProviderFilterChips
          providers={providers}
          selected={providerFilter}
          onChange={setProviderFilter}
        />
        <select
          className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          title="Severidad"
        >
          {severityFilterOptions().map((o) => (
            <option key={o.label} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          type="date"
          className="max-w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          title="Desde"
        />
        <input
          type="date"
          className="max-w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          title="Hasta"
        />
        <label className="flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-600"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
          />
          Solo activos
        </label>
        <button
          type="button"
          onClick={() => {
            setSearchQuery("");
            setProviderFilter([]);
            setSeverityFilter("");
            setActiveOnly(false);
            setDateFrom("");
            setDateTo("");
            setQuickFilter("all");
          }}
          className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200"
          title="Limpiar filtros"
        >
          × Limpiar
        </button>
        <button
          type="button"
          onClick={() =>
            exportToCSV(
              unifiedIncidents,
              `incidencias_cloud_${new Date().toISOString().slice(0, 10)}.csv`,
            )
          }
          className="flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200"
          title="Exportar incidencias filtradas a CSV"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          CSV
        </button>
        <button
          type="button"
          onClick={() => setDenseMode((v) => !v)}
          className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
            denseMode
              ? "border-blue-700 bg-blue-900/20 text-blue-300"
              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200"
          }`}
          title={denseMode ? "Desactivar modo compacto" : "Activar modo compacto"}
        >
          {denseMode ? "Compacto" : "Normal"}
        </button>
        <span className="ml-auto text-xs text-slate-500">
          {unifiedIncidents.length} resultados
        </span>
      </div>

      <Card
        title="Proveedores cloud"
        right={
          <span className="text-xs text-slate-500 dark:text-slate-400">Salud del ecosistema</span>
        }
      >
        {providers.length === 0 && !isLoading ? (
          <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-6 text-sm text-slate-500 dark:text-slate-400">
            Todavía no hay proveedores sincronizados.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {providers.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                msIntegrationConfigured={msIntegrationConfigured}
                trendPoints={providerTrends.find((t) => t.providerSlug === provider.slug)?.points.map((p) => p.totalCount)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Tabs rápidos con conteo */}
      <div className="flex flex-wrap items-center gap-1">
        {[
          { key: "all" as const, label: "Todos", count: tabCounts.total },
          { key: "active" as const, label: "Activos", count: tabCounts.active },
          { key: "critical" as const, label: "Críticos", count: tabCounts.critical },
          { key: "resolved-today" as const, label: "Resueltos hoy", count: tabCounts.resolvedToday },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setQuickFilter(tab.key)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              quickFilter === tab.key
                ? "bg-blue-600 text-white shadow-sm"
                : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:bg-white dark:bg-slate-900/40"
            }`}
          >
            <span>{tab.label}</span>
            <span className={`rounded-full px-1.5 py-0 text-[10px] font-bold ${
              quickFilter === tab.key ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <Card
        title="Timeline de incidentes"
        right={
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  viewMode === "list"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:bg-white dark:bg-slate-900/40"
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
                    : "text-slate-500 dark:text-slate-400 hover:bg-white dark:bg-slate-900/40"
                }`}
              >
                Mapa
              </button>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
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
                className="animate-pulse rounded-xl border border-slate-200 dark:border-slate-800 p-4"
              >
                <div className="h-4 w-48 rounded bg-slate-700"></div>
                <div className="mt-3 h-3 w-full rounded bg-slate-100 dark:bg-slate-800"></div>
                <div className="mt-2 h-3 w-5/6 rounded bg-slate-100 dark:bg-slate-800"></div>
              </div>
            ))}
          </div>
        ) : unifiedIncidents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-8 text-center">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No hay incidentes para los filtros actuales
            </div>
            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Ajusta proveedor, severidad o el filtro de activos para ampliar el
              contexto.
            </div>
          </div>
        ) : viewMode === "map" ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1">
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
          <div className={denseMode ? "space-y-3" : "space-y-6"}>
            {groupByDate(paginated, (i) => i.data.occurredAt).map((group) => (
              <div key={group.label} className={denseMode ? "space-y-1.5" : "space-y-3"}>
                <div className="sticky top-14 z-10 flex items-center gap-3 bg-white/80 py-1 backdrop-blur-sm dark:bg-slate-950/80 md:top-0 md:bg-transparent md:py-0 md:backdrop-blur-none dark:md:bg-transparent">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {group.label}
                  </span>
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    {group.items.length}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {new Date(Math.max(...group.items.map((i) => new Date(i.data.occurredAt).getTime()))).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" })}
                  </span>
                  <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className={denseMode ? "space-y-2" : "space-y-4"}>
                  {group.items.map((item, index) => (
                    <div
                      key={item.data.id}
                      className="animate-slide-in opacity-0"
                      style={{
                        animationDelay: `${index * 60}ms`,
                        animationFillMode: "forwards",
                      }}
                    >
                      <IncidentCard
                        variant={item.type}
                        incident={item.data}
                        isNew={newIncidentIds.has(item.data.id)}
                        dense={denseMode}
                        highlighted={item.data.id === highlightedIncidentId}
                        onSelect={() =>
                          setSelectedIncident({
                            variant: item.type,
                            incident: item.data,
                            cachedTranslation:
                              item.type === "cloud"
                                ? (translationCache[item.data.id] ?? null)
                                : undefined,
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-end border-t border-slate-200 dark:border-slate-800 pt-4">
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:bg-slate-900/40 disabled:opacity-40"
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
                    className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:bg-slate-900/40 disabled:opacity-40"
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
            className="fixed right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {selectedRegion.name}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedRegion(null)}
                className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-500 dark:text-slate-400"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-3">
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {selectedRegion.totalIncidents}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Total incidencias</div>
              </div>
              <div className="rounded-xl border border-amber-900/30 bg-amber-900/20 p-3">
                <div className="text-2xl font-bold text-amber-300">
                  {selectedRegion.activeIncidents}
                </div>
                <div className="text-xs text-amber-400">Activas</div>
              </div>
            </div>

            <div className="mb-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
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

            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Incidencias en esta región
            </div>
            <div className="space-y-3">
              {selectedRegion.incidents
                .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
                .map((incident) => (
                  <div
                    key={incident.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <CloudProviderAvatar
                        name={incident.providerName}
                        logoUrl={incident.providerLogoUrl ?? ""}
                        sizeClassName="h-7 w-7"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {incident.providerName}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDateTime(incident.occurredAt)}
                        </div>
                      </div>
                      <CloudIncidentSeverityBadge severity={incident.severity as CloudIncidentSeverity} />
                    </div>
                    <div className="mt-2 text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                      {incident.title}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {incident.isActive ? "Activa" : "Resuelta"} ·{" "}
                      {cloudIncidentStatusLabel(incident.status)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {selectedIncident && (
        <IncidentDetailModal
          isOpen={Boolean(selectedIncident)}
          onClose={() => setSelectedIncident(null)}
          variant={selectedIncident.variant}
          incident={selectedIncident.incident}
          cachedTranslation={selectedIncident.cachedTranslation}
          onTranslationLoaded={handleTranslationLoaded}
        />
      )}
    </div>
  );
}

/* IncidentCard and IncidentDetailModal now live in ../components/cloud/ */
