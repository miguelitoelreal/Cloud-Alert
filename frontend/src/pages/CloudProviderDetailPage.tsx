import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../services/apiClient";
import { createMonitoringConnection } from "../services/signalr";
import type { HubConnection } from "@microsoft/signalr";

interface CloudProviderDetailDto {
  providerId: string;
  providerName: string;
  providerSlug: string;
  logoUrl?: string;
  currentStatus: string;
  uptimePercent: number;
  incidentCount: number;
  avgMttrMinutes: number;
  recentIncidents: {
    id: string;
    title: string;
    severity: number;
    status: string;
    region?: string;
    occurredAt: string;
    officialUrl?: string;
  }[];
  affectedServices: string[];
  affectedRegions: string[];
}

function severityBadge(s: number): string {
  const map: Record<number, string> = {
    0: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    1: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    2: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    3: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };
  return map[s] ?? "bg-gray-100 text-gray-800";
}

function severityLabel(s: number): string {
  const map: Record<number, string> = { 0: "Info", 1: "Minor", 2: "Major", 3: "Critical" };
  return map[s] ?? "Unknown";
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
      setError("Failed to load provider details");
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
        <div className="h-8 w-1/3 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="h-40 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="h-64 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex items-center gap-4">
          {detail.logoUrl ? (
            <img src={detail.logoUrl} alt={detail.providerName} className="h-16 w-16 rounded-lg object-contain shrink-0" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-2xl font-bold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
              {detail.providerName.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{detail.providerName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${detail.currentStatus === "Operational" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"}`}>
                {detail.currentStatus}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Uptime: {detail.uptimePercent.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 md:hidden"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
          Volver
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Incidents</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{detail.incidentCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg MTTR</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{detail.avgMttrMinutes}m</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Affected Services</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{detail.affectedServices.length}</p>
        </div>
      </div>

      {detail.affectedServices.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Affected Services</h3>
          <div className="flex flex-wrap gap-2">
            {detail.affectedServices.map((s) => (
              <span key={s} className="rounded-lg bg-blue-50 px-3 py-1 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {detail.affectedRegions.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Affected Regions</h3>
          <div className="flex flex-wrap gap-2">
            {detail.affectedRegions.map((r) => (
              <span key={r} className="rounded-lg bg-purple-50 px-3 py-1 text-sm text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">
                {r}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Incidents</h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {detail.recentIncidents.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
              No recent incidents for this provider.
            </div>
          )}
          {detail.recentIncidents.map((inc) => (
            <div key={inc.id} className="flex flex-col gap-2 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 sm:flex-row sm:items-start sm:justify-between sm:px-6">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${severityBadge(inc.severity)}`}>
                    {severityLabel(inc.severity)}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{inc.title}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  {inc.region && <span>Region: {inc.region}</span>}
                  <span>Status: {inc.status}</span>
                  <span>{new Date(inc.occurredAt).toLocaleString()}</span>
                </div>
              </div>
              {inc.officialUrl && (
                <a
                  href={inc.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  Official
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
