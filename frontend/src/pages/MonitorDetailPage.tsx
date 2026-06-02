import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card } from "../components/Card";
import { StateBanner } from "../components/StateBanner";
import { StatusBadge } from "../components/StatusBadge";
import { usePolling } from "../hooks/usePolling";
import { getMonitorLogs } from "../services/monitorLogs";
import { getMonitorById } from "../services/monitors";
import { createMonitoringConnection } from "../services/signalr";
import { MonitorStatus, type MonitorResponseDto } from "../types/monitor";
import type { MonitorLogResponseDto } from "../types/monitorLog";
import type {
  MonitorLogCreatedEvent,
  MonitorUpdatedEvent,
} from "../types/realtime";

const REFRESH_MS = 10_000;

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-PE", {
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

function computeUptime(logs: MonitorLogResponseDto[]): number | null {
  if (logs.length === 0) return null;
  const online = logs.filter((l) => l.status === MonitorStatus.Online).length;
  return (online / logs.length) * 100;
}

export function MonitorDetailPage() {
  const { id } = useParams();

  const [monitor, setMonitor] = useState<MonitorResponseDto | null>(null);
  const [logs, setLogs] = useState<MonitorLogResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  const latestLog = logs[0] ?? null;
  const uptime = useMemo(() => computeUptime(logs), [logs]);

  async function load() {
    if (!id) return;
    setError(null);

    try {
      const [monitorData, logsData] = await Promise.all([
        getMonitorById(id),
        getMonitorLogs(id, 100),
      ]);
      setMonitor(monitorData);
      setLogs(logsData);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to load monitor details";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    document.title = monitor?.name
      ? `Cloud Alert Hub — ${monitor.name}`
      : "Cloud Alert Hub — Monitor";
  }, [monitor?.name]);

  useEffect(() => {
    if (!id) return;

    const connection = createMonitoringConnection();

    connection.on("MonitorUpdated", (update: MonitorUpdatedEvent) => {
      if (update.id !== id) return;

      setMonitor((current) => {
        if (!current) return current;

        return {
          ...current,
          status: update.currentStatus,
          updatedAt: update.lastCheckedAt ?? current.updatedAt,
        };
      });
    });

    connection.on("MonitorLogCreated", (log: MonitorLogCreatedEvent) => {
      if (log.monitorId !== id) return;

      setLogs((current) =>
        [log, ...current.filter((item) => item.id !== log.id)].slice(0, 100),
      );
    });

    connection.onreconnected(() => setIsRealtimeConnected(true));
    connection.onclose(() => setIsRealtimeConnected(false));
    connection.onreconnecting(() => setIsRealtimeConnected(false));

    void connection
      .start()
      .then(() => setIsRealtimeConnected(true))
      .catch(() => setIsRealtimeConnected(false));

    return () => {
      void connection.stop();
    };
  }, [id]);

  usePolling(
    load,
    { intervalMs: REFRESH_MS, enabled: Boolean(id) && !isRealtimeConnected },
    [id, isRealtimeConnected],
  );

  if (!id) {
    return (
      <StateBanner
        tone="error"
        title="Monitor inválido"
        message="Falta el id del monitor en la URL."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${isRealtimeConnected ? "bg-green-500" : "bg-gray-400 animate-pulse"}`}
        ></span>
        <span className="text-xs text-gray-500">
          {isRealtimeConnected
            ? "Tiempo real activo"
            : "Polling de respaldo activo"}
        </span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">
              {monitor?.name ?? (isLoading ? "Cargando…" : "Monitor")}
            </h1>
            {monitor ? <StatusBadge status={monitor.status} /> : null}
          </div>
          <div className="mt-1 text-sm text-gray-600">{monitor?.url ?? ""}</div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            className="text-sm font-medium text-blue-600 hover:underline"
            to="/dashboard"
          >
            Volver al Centro de Monitoreo
          </Link>
        </div>
      </div>

      {error ? (
        <StateBanner
          tone="error"
          title="No se pudo cargar el monitor"
          message={error}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card title="Estado actual">
          <div className="text-2xl font-semibold text-gray-900">
            {monitor ? (
              <StatusBadge status={monitor.status} />
            ) : isLoading ? (
              "—"
            ) : (
              "—"
            )}
          </div>
        </Card>
        <Card title="Tiempo de respuesta">
          <div className="text-2xl font-semibold text-gray-900">
            {latestLog?.responseTimeMs != null
              ? `${latestLog.responseTimeMs} ms`
              : "—"}
          </div>
          <div className="mt-1 text-xs text-gray-500">Última medición</div>
        </Card>
        <Card title="Uptime (últimos 100)">
          <div className="text-2xl font-semibold text-gray-900">
            {uptime != null ? `${uptime.toFixed(1)}%` : "—"}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Basado en logs disponibles
          </div>
        </Card>
        <Card title="Última verificación">
          <div className="text-2xl font-semibold text-gray-900">
            {latestLog?.checkedAt ? formatDateTime(latestLog.checkedAt) : "—"}
          </div>
          <div className="mt-1 text-xs text-gray-500">Timestamp</div>
        </Card>
      </div>

      <Card title="Historial de logs">
        {isLoading ? (
          <div className="text-sm text-gray-600">Cargando historial…</div>
        ) : logs.length === 0 ? (
          <div className="text-sm text-gray-600">
            Aún no hay logs para este monitor.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs text-gray-500">
                <tr>
                  <th className="px-2 py-2 font-medium">Estado</th>
                  <th className="px-2 py-2 font-medium">Código HTTP</th>
                  <th className="px-2 py-2 font-medium">Tiempo de respuesta</th>
                  <th className="px-2 py-2 font-medium">Verificado en</th>
                  <th className="px-2 py-2 font-medium">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="px-2 py-2 text-gray-700">
                      {l.statusCode ?? "—"}
                    </td>
                    <td
                      className="px-2 py-2 text-gray-700 cursor-help"
                      title={
                        l.dnsTimeMs != null || l.connectTimeMs != null || l.tlsTimeMs != null || l.ttfbTimeMs != null
                          ? `DNS: ${l.dnsTimeMs ?? "—"}ms | Conexión: ${l.connectTimeMs ?? "—"}ms | TLS: ${l.tlsTimeMs ?? "—"}ms | TTFB: ${l.ttfbTimeMs ?? "—"}ms`
                          : undefined
                      }
                    >
                      {l.responseTimeMs != null
                        ? `${l.responseTimeMs} ms`
                        : "—"}
                    </td>
                    <td className="px-2 py-2 text-gray-700">
                      {formatDateTime(l.checkedAt)}
                    </td>
                    <td className="px-2 py-2 text-gray-700">
                      {l.errorMessage ? (
                        <span
                          className="block max-w-[520px] truncate"
                          title={l.errorMessage}
                        >
                          {l.errorMessage}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
