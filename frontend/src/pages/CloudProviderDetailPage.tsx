import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../services/apiClient";
import { createMonitoringConnection } from "../services/signalr";
import type { HubConnection } from "@microsoft/signalr";
import { IncidentDetailModal } from "../components/cloud/IncidentDetailModal";
import type { CloudIncidentDto, CloudIncidentTranslationDto, CloudIncidentSeverity, CloudIncidentStatus } from "../types/cloudStatus";

function ExpandableChipList({ items, limit, chipClass, emptyMsg }: { items: string[]; limit: number; chipClass: string; emptyMsg?: string }) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return emptyMsg ? <p className="text-xs text-slate-400">{emptyMsg}</p> : null;
  const visible = expanded ? items : items.slice(0, limit);
  const hiddenCount = items.length - limit;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {visible.map((item) => (
          <span key={item} className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${chipClass}`}>
            {item}
          </span>
        ))}
      </div>
      {hiddenCount > 0 && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm transition-all hover:-translate-y-px hover:bg-white hover:shadow dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Ver {hiddenCount} mas
        </button>
      )}
      {expanded && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm transition-all hover:-translate-y-px hover:bg-white hover:shadow dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" /></svg>
          Ver menos
        </button>
      )}
    </div>
  );
}

interface CloudProviderDetailDto {
  provider: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string;
    statusPageUrl: string | null;
    isEnabled: boolean;
    lastSyncedAt: string | null;
    lastSyncError: string | null;
    activeIncidents: number;
  };
  recentIncidents: {
    id: string;
    title: string;
    severity: number;
    status: string;
    region: string | null;
    occurredAt: string;
    officialUrl: string;
    description: string;
    isActive: boolean;
    affectedServices: string[];
  }[];
  recentEvents: {
    id: string;
    cloudIncidentId: string;
    previousStatus: string;
    newStatus: string;
    eventDescription: string;
    occurredAt: string;
  }[];
  analytics: {
    providerId: string;
    providerName: string;
    providerSlug: string;
    uptimePercent: number;
    incidentCount: number;
    avgMttrMinutes: number;
    downtimeMinutes: number;
    severityDistribution: { severity: number; count: number }[];
  } | null;
  affectedServices: string[];
  affectedRegions: string[];
}

const severityConfig: Record<number, { label: string; border: string; badge: string; dot: string }> = {
  0: { label: "Info", border: "border-l-blue-500", badge: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", dot: "bg-blue-500" },
  1: { label: "Menor", border: "border-l-yellow-500", badge: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300", dot: "bg-yellow-500" },
  2: { label: "Mayor", border: "border-l-orange-500", badge: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300", dot: "bg-orange-500" },
  3: { label: "Critica", border: "border-l-red-500", badge: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300", dot: "bg-red-500" },
};

function getSeverity(s: number) {
  return severityConfig[s] ?? severityConfig[0];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days} dia${days > 1 ? "s" : ""}`;
}

export function CloudProviderDetailPage() {
  const navigate = useNavigate();
  const { providerSlug } = useParams<{ providerSlug: string }>();
  const [detail, setDetail] = useState<CloudProviderDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<CloudIncidentDto | null>(null);
  const [translations, setTranslations] = useState<Record<string, CloudIncidentTranslationDto>>({});
  const [incidentPage, setIncidentPage] = useState(1);
  const INCIDENTS_PER_PAGE = 15;

  const load = async () => {
    if (!providerSlug) return;
    try {
      setLoading(true);
      const res = await apiClient.get<CloudProviderDetailDto>(`/api/cloud-status/providers/${providerSlug}`);
      setDetail(res.data);
      setError(null);
    } catch {
      setError("No se pudieron cargar los detalles del proveedor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [providerSlug]);

  useEffect(() => {
    const connection: HubConnection = createMonitoringConnection();
    connection.on("ProviderSynced", () => void load());
    connection.on("IncidentCreated", () => void load());
    connection.on("IncidentUpdated", () => void load());
    void connection.start().catch(() => {});
    return () => {
      void connection.stop();
    };
  }, [providerSlug]);

  if (loading && !detail) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
        {error ?? "Provider not found"}
      </div>
    );
  }

  const isOperational = detail.provider.activeIncidents === 0;

  const totalIncidentPages = Math.ceil((detail?.recentIncidents.length ?? 0) / INCIDENTS_PER_PAGE);
  const paginatedIncidents = detail?.recentIncidents.slice((incidentPage - 1) * INCIDENTS_PER_PAGE, incidentPage * INCIDENTS_PER_PAGE) ?? [];

  function openIncidentModal(inc: CloudProviderDetailDto["recentIncidents"][number]) {
    const fullIncident: CloudIncidentDto = {
      id: inc.id,
      providerId: detail!.provider.id,
      providerName: detail!.provider.name,
      providerSlug: detail!.provider.slug,
      providerLogoUrl: detail!.provider.logoUrl,
      title: inc.title,
      description: inc.description,
      severity: inc.severity as unknown as CloudIncidentSeverity,
      status: inc.status as unknown as CloudIncidentStatus,
      region: inc.region,
      affectedServices: inc.affectedServices,
      source: "cloud",
      officialUrl: inc.officialUrl,
      isActive: inc.isActive,
      occurredAt: inc.occurredAt,
      lastUpdatedAt: inc.occurredAt,
      resolvedAt: inc.isActive ? null : inc.occurredAt,
      displayStatus: inc.isActive ? "Activo" : "Resuelto",
    };
    setSelectedIncident(fullIncident);
    setModalOpen(true);
  }

  function handleTranslationLoaded(incidentId: string, translation: CloudIncidentTranslationDto) {
    setTranslations((prev) => ({ ...prev, [incidentId]: translation }));
  }
  const uptime = (detail.analytics?.uptimePercent ?? 100).toFixed(2);
  const totalIncidentes = detail.analytics?.incidentCount ?? detail.recentIncidents.length;
  const mttr = detail.analytics?.avgMttrMinutes ?? 0;
  const serviciosAfectados = detail.affectedServices.length;

  return (
    <div className="space-y-6">
      {/* ===== HERO ===== */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-gradient-to-br from-white via-slate-50/50 to-slate-100/60 p-6 shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 sm:p-8">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 opacity-80" />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/5 blur-3xl dark:bg-blue-500/10" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl dark:bg-emerald-500/10" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              {detail.provider.logoUrl ? (
                <img src={detail.provider.logoUrl} alt={detail.provider.name} className="h-20 w-20 rounded-2xl border border-slate-200/80 bg-white object-contain p-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:h-24 sm:w-24" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-3xl font-bold text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 sm:h-24 sm:w-24">
                  {detail.provider.name.charAt(0)}
                </div>
              )}
              <span className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white shadow-sm dark:border-slate-900 ${isOperational ? "bg-emerald-500" : "bg-rose-500"}`}>
                {!isOperational && <span className="absolute inset-0 inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />}
              </span>
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{detail.provider.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${isOperational ? "border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-500/10 dark:text-emerald-400" : "border-rose-200/60 bg-rose-50 text-rose-700 dark:border-rose-800/40 dark:bg-rose-500/10 dark:text-rose-400"}`}>
                  <span className={`h-2 w-2 rounded-full ${isOperational ? "bg-emerald-500" : "bg-rose-500 animate-pulse"}`} />
                  {isOperational ? "Operativo" : `${detail.provider.activeIncidents} incidente${detail.provider.activeIncidents > 1 ? "s" : ""} activo${detail.provider.activeIncidents > 1 ? "s" : ""}`}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                  Uptime: {uptime}%
                </span>
                {detail.provider.statusPageUrl && (
                  <a href={detail.provider.statusPageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 013 3.75v-1.5m0 9c0 .966.392 1.841 1.028 2.475l.675.675M9 12.75l-2.25 2.25M9 12.75l2.25-2.25M9 12.75V9.75m3 3v3m0 0l2.25 2.25m-2.25-2.25l2.25-2.25M15 12.75V9.75m0 0c0-.966-.392-1.841-1.028-2.475l-.675-.675M15 12.75l-2.25 2.25m2.25-2.25l-2.25-2.25" /></svg>
                    Fuente oficial
                  </a>
                )}
              </div>
            </div>
          </div>
          <button type="button" onClick={() => navigate(-1)} className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-px hover:bg-white hover:shadow dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-800">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
            Volver
          </button>
        </div>
      </div>

      {/* ===== STATS ===== */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="group relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800/60 dark:bg-slate-950/80 sm:p-7">
          <div className="absolute right-4 top-4 rounded-2xl bg-amber-50 p-3 transition-transform group-hover:scale-110 dark:bg-amber-500/10">
            <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total incidentes</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{totalIncidentes}</p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full w-3/4 rounded-full bg-amber-400" />
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800/60 dark:bg-slate-950/80 sm:p-7">
          <div className="absolute right-4 top-4 rounded-2xl bg-violet-50 p-3 transition-transform group-hover:scale-110 dark:bg-violet-500/10">
            <svg className="h-6 w-6 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">MTTR promedio</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{mttr}m</p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full w-1/2 rounded-full bg-violet-400" />
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800/60 dark:bg-slate-950/80 sm:p-7">
          <div className="absolute right-4 top-4 rounded-2xl bg-emerald-50 p-3 transition-transform group-hover:scale-110 dark:bg-emerald-500/10">
            <svg className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.25 2.25v5.372c0 .43-.119.845-.343 1.196l-1.93 3.088a2.25 2.25 0 01-1.909 1.055H9.18a2.25 2.25 0 01-1.909-1.055l-1.93-3.088A2.25 2.25 0 014.5 10.372V5.25c0-1.24 1.01-2.25 2.25-2.25h1.5a2.251 2.251 0 012.15 1.586m5.8 0c.065.21.1.433.1.664v5.372c0 .43-.119.845-.343 1.196l-1.93 3.088a2.25 2.25 0 01-1.909 1.055H9.18a2.25 2.25 0 01-1.909-1.055l-1.93-3.088A2.25 2.25 0 014.5 10.372V5.25c0-1.24 1.01-2.25 2.25-2.25h1.5a2.251 2.251 0 012.15 1.586z" /></svg>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Servicios afectados</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{serviciosAfectados}</p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(serviciosAfectados * 20, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* ===== SEVERITY + SERVICES/REGIONS GRID ===== */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Severity bar chart — takes 3 cols */}
        {(() => {
          const dist = detail.analytics?.severityDistribution ?? [];
          if (dist.length === 0) return null;
          const total = dist.reduce((sum, s) => sum + s.count, 0) || 1;
          return (
            <div className="col-span-1 rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-950/80 sm:col-span-1 lg:col-span-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Distribucion por severidad</h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">{total} total</span>
              </div>
              {/* Stacked horizontal bar */}
              <div className="mt-5 flex h-4 overflow-hidden rounded-full">
                {dist.map((s) => {
                  const cfg = getSeverity(s.severity);
                  const pct = (s.count / total) * 100;
                  return (
                    <div key={s.severity} className={`${cfg.dot} relative group/bar transition-all`} style={{ width: `${pct}%` }} title={`${cfg.label}: ${s.count}`}>
                      <div className="absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-bold text-white shadow-lg group-hover/bar:block dark:bg-white dark:text-slate-900">
                        {cfg.label}: {s.count}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-4">
                {dist.map((s) => {
                  const cfg = getSeverity(s.severity);
                  const pct = ((s.count / total) * 100).toFixed(1);
                  return (
                    <div key={s.severity} className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{cfg.label}</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{s.count}</span>
                      <span className="text-[10px] text-slate-400">({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Services & Regions — takes 2 cols */}
        <div className="col-span-1 grid gap-4 lg:col-span-2">
          <div className="rounded-3xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-950/80">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95 1.18l-.516.808a.75.75 0 01-1.262 0l-.515-.808a3.735 3.735 0 00-2.949-1.18 4.5 4.5 0 01-4.884-4.484A4.5 4.5 0 016.75 2.25 4.5 4.5 0 0111.25 6.75c0 1.398-.626 2.65-1.613 3.487a4.474 4.474 0 00-2.364-.66 4.5 4.5 0 00-4.884 4.484c0 1.398.626 2.65 1.613 3.487.938.836 2.19 1.273 3.487 1.273.807 0 1.584-.186 2.283-.525a.75.75 0 01.745.043c.78.525 1.696.807 2.64.807.943 0 1.86-.282 2.64-.807a.75.75 0 01.745-.043c.7.339 1.477.525 2.283.525 1.298 0 2.55-.437 3.487-1.273.987-.837 1.613-2.089 1.613-3.487A4.5 4.5 0 0015.75 9.75a4.474 4.474 0 00-2.364.66c-.987-.837-1.613-2.089-1.613-3.487A4.5 4.5 0 0115.75 2.25z" /></svg>
              Servicios afectados
            </h3>
            <ExpandableChipList
              items={detail.affectedServices}
              limit={6}
              chipClass="border border-blue-100 bg-blue-50/70 text-blue-700 hover:bg-blue-100 dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
              emptyMsg="No hay servicios afectados."
            />
          </div>
          <div className="rounded-3xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-950/80">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
              Regiones afectadas
            </h3>
            <ExpandableChipList
              items={detail.affectedRegions}
              limit={6}
              chipClass="border border-purple-100 bg-purple-50/70 text-purple-700 hover:bg-purple-100 dark:border-purple-900/30 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/30"
              emptyMsg="No hay regiones afectadas."
            />
          </div>
        </div>
      </div>

      {/* ===== INCIDENTES ===== */}
      <div className="rounded-3xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-950/80">
        <div className="flex items-center gap-3 border-b border-slate-200/60 px-6 py-5 dark:border-slate-800/60 sm:px-7">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <svg className="h-5 w-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
          </div>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">Incidentes</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Historial completo de incidentes</p>
          </div>
          <span className="ml-auto rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">{detail.recentIncidents.length} total</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {detail.recentIncidents.length === 0 && (
            <div className="px-6 py-14 text-center sm:px-7">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-900/20">
                <svg className="h-7 w-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Sin incidentes registrados</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Este proveedor no tiene incidentes historicos.</p>
            </div>
          )}

          {paginatedIncidents.map((inc) => {
            const cfg = getSeverity(inc.severity);
            return (
              <button
                key={inc.id}
                type="button"
                onClick={() => openIncidentModal(inc)}
                className={`relative w-full border-l-[5px] ${cfg.border} px-5 py-5 text-left transition-all hover:bg-slate-50/60 dark:hover:bg-slate-800/40 sm:px-7 sm:py-6`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2.5">
                    {/* Badges row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                      {inc.isActive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-100 bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:border-rose-900/30 dark:bg-rose-500/10 dark:text-rose-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-500/10 dark:text-emerald-400">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Resuelto
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-[15px] font-bold leading-snug text-slate-900 dark:text-white">{inc.title}</h3>

                    {/* Description */}
                    {inc.description && (
                      <p className="line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{inc.description}</p>
                    )}

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                      {inc.region && (
                        <span className="inline-flex items-center gap-1.5">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                          {inc.region}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5" title={formatDate(inc.occurredAt)}>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {relativeTime(inc.occurredAt)}
                      </span>
                      {inc.affectedServices.length > 0 && (
                        <span className="inline-flex items-center gap-1.5">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95 1.18l-.516.808a.75.75 0 01-1.262 0l-.515-.808a3.735 3.735 0 00-2.949-1.18 4.5 4.5 0 01-4.884-4.484A4.5 4.5 0 016.75 2.25 4.5 4.5 0 0111.25 6.75c0 1.398-.626 2.65-1.613 3.487a4.474 4.474 0 00-2.364-.66 4.5 4.5 0 00-4.884 4.484c0 1.398.626 2.65 1.613 3.487.938.836 2.19 1.273 3.487 1.273.807 0 1.584-.186 2.283-.525a.75.75 0 01.745.043c.78.525 1.696.807 2.64.807.943 0 1.86-.282 2.64-.807a.75.75 0 01.745-.043c.7.339 1.477.525 2.283.525 1.298 0 2.55-.437 3.487-1.273.987-.837 1.613-2.089 1.613-3.487A4.5 4.5 0 0015.75 9.75a4.474 4.474 0 00-2.364.66c-.987-.837-1.613-2.089-1.613-3.487A4.5 4.5 0 0115.75 2.25z" /></svg>
                          {inc.affectedServices.length} servicio{inc.affectedServices.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {inc.officialUrl && (
                    <a href={inc.officialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-xs font-bold text-slate-600 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-px hover:bg-white hover:text-slate-900 hover:shadow dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 013 3.75v-1.5m0 9c0 .966.392 1.841 1.028 2.475l.675.675M9 12.75l-2.25 2.25M9 12.75l2.25-2.25M9 12.75V9.75m3 3v3m0 0l2.25 2.25m-2.25-2.25l2.25-2.25M15 12.75V9.75m0 0c0-.966-.392-1.841-1.028-2.475l-.675-.675M15 12.75l-2.25 2.25m2.25-2.25l-2.25-2.25" /></svg>
                      Ver fuente
                    </a>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* ===== PAGINATION ===== */}
        {detail.recentIncidents.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200/60 px-6 py-4 dark:border-slate-800/60 sm:px-7">
            <button
              type="button"
              onClick={() => setIncidentPage((p) => Math.max(1, p - 1))}
              disabled={incidentPage <= 1}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-xs font-bold text-slate-600 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-px hover:bg-white hover:shadow disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              Anterior
            </button>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Mostrando {Math.min(paginatedIncidents.length, INCIDENTS_PER_PAGE)} de {detail.recentIncidents.length} &middot; Pagina {incidentPage} de {totalIncidentPages}
            </span>
            <button
              type="button"
              onClick={() => setIncidentPage((p) => Math.min(totalIncidentPages, p + 1))}
              disabled={incidentPage >= totalIncidentPages}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-xs font-bold text-slate-600 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-px hover:bg-white hover:shadow disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Siguiente
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </button>
          </div>
        )}
      </div>

      {selectedIncident && (
        <IncidentDetailModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          variant="cloud"
          incident={selectedIncident}
          cachedTranslation={translations[selectedIncident.id] ?? null}
          onTranslationLoaded={handleTranslationLoaded}
        />
      )}
    </div>
  );
}
