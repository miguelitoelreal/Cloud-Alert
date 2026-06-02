import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../services/apiClient";
import { createMonitoringConnection } from "../services/signalr";
import type { HubConnection } from "@microsoft/signalr";

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

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
      <div className={`absolute right-0 top-0 h-16 w-16 -translate-y-2 translate-x-2 rounded-full opacity-10 ${color}`} />
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color} bg-opacity-10`}>
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-0.5 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function CloudProviderDetailPage() {
  const navigate = useNavigate();
  const { providerSlug } = useParams<{ providerSlug: string }>();
  const [detail, setDetail] = useState<CloudProviderDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-5">
            {detail.provider.logoUrl ? (
              <img src={detail.provider.logoUrl} alt={detail.provider.name} className="h-20 w-20 rounded-2xl border border-slate-200 object-contain p-2 dark:border-slate-800" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-3xl font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {detail.provider.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{detail.provider.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${isOperational ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-300" : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-300"}`}>
                  <span className={`h-2 w-2 rounded-full ${isOperational ? "bg-emerald-500" : "bg-red-500 animate-pulse"}`} />
                  {isOperational ? "Operativo" : `${detail.provider.activeIncidents} incidente${detail.provider.activeIncidents > 1 ? "s" : ""} activo${detail.provider.activeIncidents > 1 ? "s" : ""}`}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                  Uptime: {(detail.analytics?.uptimePercent ?? 100).toFixed(2)}%
                </span>
                {detail.provider.statusPageUrl && (
                  <a
                    href={detail.provider.statusPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 013 3.75v-1.5m0 9c0 .966.392 1.841 1.028 2.475l.675.675M9 12.75l-2.25 2.25M9 12.75l2.25-2.25M9 12.75V9.75m3 3v3m0 0l2.25 2.25m-2.25-2.25l2.25-2.25M15 12.75V9.75m0 0c0-.966-.392-1.841-1.028-2.475l-.675-.675M15 12.75l-2.25 2.25m2.25-2.25l-2.25-2.25" /></svg>
                    Fuente oficial
                  </a>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
            Volver
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={<svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>}
          label="Total incidentes"
          value={detail.analytics?.incidentCount ?? detail.recentIncidents.length}
          color="bg-amber-500"
        />
        <StatCard
          icon={<svg className="h-5 w-5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          label="MTTR promedio"
          value={`${detail.analytics?.avgMttrMinutes ?? 0}m`}
          color="bg-violet-500"
        />
        <StatCard
          icon={<svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.25 2.25v5.372c0 .43-.119.845-.343 1.196l-1.93 3.088a2.25 2.25 0 01-1.909 1.055H9.18a2.25 2.25 0 01-1.909-1.055l-1.93-3.088A2.25 2.25 0 014.5 10.372V5.25c0-1.24 1.01-2.25 2.25-2.25h1.5a2.251 2.251 0 012.15 1.586m5.8 0c.065.21.1.433.1.664v5.372c0 .43-.119.845-.343 1.196l-1.93 3.088a2.25 2.25 0 01-1.909 1.055H9.18a2.25 2.25 0 01-1.909-1.055l-1.93-3.088A2.25 2.25 0 014.5 10.372V5.25c0-1.24 1.01-2.25 2.25-2.25h1.5a2.251 2.251 0 012.15 1.586z" /></svg>}
          label="Servicios afectados"
          value={detail.affectedServices.length}
          color="bg-emerald-500"
        />
      </div>

      {/* Severity distribution */}
      {(() => {
        const dist = detail.analytics?.severityDistribution ?? [];
        if (dist.length === 0) return null;
        const maxCount = Math.max(...dist.map((s) => s.count), 1);
        return (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Distribucion por severidad</h3>
            <div className="mt-4 flex items-end gap-4">
              {dist.map((s) => {
                const cfg = getSeverity(s.severity);
                const pct = (s.count / maxCount) * 100;
                return (
                  <div key={s.severity} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-lg font-bold text-slate-900 dark:text-white">{s.count}</span>
                    <div className="relative w-full rounded-t-lg bg-slate-100 dark:bg-slate-800" style={{ height: "80px" }}>
                      <div className={`absolute bottom-0 w-full rounded-t-lg transition-all ${cfg.dot}`} style={{ height: `${pct}%`, opacity: 0.8 }} />
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.badge}`}>{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Services & Regions */}
      <div className="grid gap-4 md:grid-cols-2">
        {detail.affectedServices.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Servicios afectados</h3>
            <div className="flex flex-wrap gap-2">
              {detail.affectedServices.map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95 1.18l-.516.808a.75.75 0 01-1.262 0l-.515-.808a3.735 3.735 0 00-2.949-1.18 4.5 4.5 0 01-4.884-4.484A4.5 4.5 0 016.75 2.25 4.5 4.5 0 0111.25 6.75c0 1.398-.626 2.65-1.613 3.487a4.474 4.474 0 00-2.364-.66 4.5 4.5 0 00-4.884 4.484c0 1.398.626 2.65 1.613 3.487.938.836 2.19 1.273 3.487 1.273.807 0 1.584-.186 2.283-.525a.75.75 0 01.745.043c.78.525 1.696.807 2.64.807.943 0 1.86-.282 2.64-.807a.75.75 0 01.745-.043c.7.339 1.477.525 2.283.525 1.298 0 2.55-.437 3.487-1.273.987-.837 1.613-2.089 1.613-3.487A4.5 4.5 0 0015.75 9.75a4.474 4.474 0 00-2.364.66c-.987-.837-1.613-2.089-1.613-3.487A4.5 4.5 0 0115.75 2.25z" /></svg>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
        {detail.affectedRegions.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Regiones afectadas</h3>
            <div className="flex flex-wrap gap-2">
              {detail.affectedRegions.map((r) => (
                <span key={r} className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Incidentes */}
      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Incidentes <span className="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">{detail.recentIncidents.length}</span></h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {detail.recentIncidents.length === 0 && (
            <div className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
              <svg className="mx-auto mb-3 h-10 w-10 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              No hay incidentes registrados para este proveedor.
            </div>
          )}
          {detail.recentIncidents.map((inc) => {
            const cfg = getSeverity(inc.severity);
            return (
              <div
                key={inc.id}
                className={`relative border-l-4 ${cfg.border} px-5 py-5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 sm:px-6`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    {/* Top row: badge + title */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cfg.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                      {inc.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Resuelto
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{inc.title}</h3>

                    {/* Description */}
                    {inc.description && (
                      <p className="line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{inc.description}</p>
                    )}

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                      {inc.region && (
                        <span className="inline-flex items-center gap-1">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                          {inc.region}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1" title={formatDate(inc.occurredAt)}>
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {relativeTime(inc.occurredAt)}
                      </span>
                      {inc.affectedServices.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95 1.18l-.516.808a.75.75 0 01-1.262 0l-.515-.808a3.735 3.735 0 00-2.949-1.18 4.5 4.5 0 01-4.884-4.484A4.5 4.5 0 016.75 2.25 4.5 4.5 0 0111.25 6.75c0 1.398-.626 2.65-1.613 3.487a4.474 4.474 0 00-2.364-.66 4.5 4.5 0 00-4.884 4.484c0 1.398.626 2.65 1.613 3.487.938.836 2.19 1.273 3.487 1.273.807 0 1.584-.186 2.283-.525a.75.75 0 01.745.043c.78.525 1.696.807 2.64.807.943 0 1.86-.282 2.64-.807a.75.75 0 01.745-.043c.7.339 1.477.525 2.283.525 1.298 0 2.55-.437 3.487-1.273.987-.837 1.613-2.089 1.613-3.487A4.5 4.5 0 0015.75 9.75a4.474 4.474 0 00-2.364.66c-.987-.837-1.613-2.089-1.613-3.487A4.5 4.5 0 0115.75 2.25z" /></svg>
                          {inc.affectedServices.length} servicio{inc.affectedServices.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Official link */}
                  {inc.officialUrl && (
                    <a
                      href={inc.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 013 3.75v-1.5m0 9c0 .966.392 1.841 1.028 2.475l.675.675M9 12.75l-2.25 2.25M9 12.75l2.25-2.25M9 12.75V9.75m3 3v3m0 0l2.25 2.25m-2.25-2.25l2.25-2.25M15 12.75V9.75m0 0c0-.966-.392-1.841-1.028-2.475l-.675-.675M15 12.75l-2.25 2.25m2.25-2.25l-2.25-2.25" /></svg>
                      Ver fuente
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
