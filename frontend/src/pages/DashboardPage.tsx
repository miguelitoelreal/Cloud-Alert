import { useEffect, useMemo, useState } from "react";
import { createMonitoringConnection } from "../services/signalr";
import type { DashboardMonitorSummaryDto } from "../types/dashboard";
import type { MonitorUpdatedEvent } from "../types/realtime";
import { Link } from "react-router-dom";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Modal } from "../components/Modal";
import { MonitorForm, type MonitorFormValues } from "../components/MonitorForm";
import { StatCard } from "../components/StatCard";
import { StateBanner } from "../components/StateBanner";
import { StatusBadge } from "../components/StatusBadge";
import { usePolling } from "../hooks/usePolling";
import { getDashboardMonitors } from "../services/dashboard";
import {
  createMonitor,
  deleteMonitor,
  getMonitorById,
  updateMonitor,
} from "../services/monitors";
import { MonitorStatus } from "../types/monitor";
import type { MonitorResponseDto } from "../types/monitor";
import { getNetworkInfo } from "../services/networkInfo";
import type { NetworkInfoResponseDto } from "../types/networkInfo";

const REFRESH_MS = 10_000;

type DashboardStats = {
  total: number;
  online: number;
  offline: number;
  averageResponseTimeMs: number | null;
};

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

function computeStats(monitors: DashboardMonitorSummaryDto[]): DashboardStats {
  let online = 0;
  let offline = 0;
  let responseTimeCount = 0;
  let responseTimeSum = 0;

  for (const monitor of monitors) {
    if (monitor.currentStatus === MonitorStatus.Online) online += 1;
    else if (monitor.currentStatus === MonitorStatus.Offline) offline += 1;

    if (monitor.lastResponseTimeMs != null) {
      responseTimeCount += 1;
      responseTimeSum += monitor.lastResponseTimeMs;
    }
  }

  const averageResponseTimeMs =
    responseTimeCount > 0 ? responseTimeSum / responseTimeCount : null;

  return {
    total: monitors.length,
    online,
    offline,
    averageResponseTimeMs,
  };
}

function mergeMonitorUpdate(
  current: DashboardMonitorSummaryDto | undefined,
  update: MonitorUpdatedEvent,
): DashboardMonitorSummaryDto {
  return {
    id: update.id,
    name: update.name,
    url: update.url,
    currentStatus: update.currentStatus,
    lastCheckedAt: update.lastCheckedAt,
    lastResponseTimeMs: update.lastResponseTimeMs,
    uptimePercentage:
      update.uptimePercentage ?? current?.uptimePercentage ?? null,
    totalChecks: update.totalChecks ?? current?.totalChecks ?? 0,
    failedChecks: update.failedChecks ?? current?.failedChecks ?? 0,
  };
}

export function DashboardPage() {
  const [monitors, setMonitors] = useState<DashboardMonitorSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [flash, setFlash] = useState<{
    tone: "success" | "error";
    title: string;
    message?: string;
  } | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editMonitor, setEditMonitor] = useState<MonitorResponseDto | null>(
    null,
  );
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<DashboardMonitorSummaryDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [netInfoOpen, setNetInfoOpen] = useState(false);
  const [netInfoTarget, setNetInfoTarget] =
    useState<DashboardMonitorSummaryDto | null>(null);
  const [netInfoData, setNetInfoData] = useState<NetworkInfoResponseDto | null>(
    null,
  );
  const [netInfoLoading, setNetInfoLoading] = useState(false);
  const [netInfoError, setNetInfoError] = useState<string | null>(null);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  async function load() {
    setError(null);
    try {
      const data = await getDashboardMonitors();
      setMonitors(data);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to load monitors";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  function openCreate() {
    setCreateError(null);
    setCreateOpen(true);
  }

  async function handleManualRefresh() {
    setIsManualRefreshing(true);
    try {
      await load();
    } finally {
      setIsManualRefreshing(false);
    }
  }

  async function handleCreate(values: MonitorFormValues) {
    setCreateError(null);
    setIsCreating(true);
    try {
      const newMonitor = await createMonitor(values);
      setCreateOpen(false);
      setFlash({
        tone: "success",
        title: "Monitor creado",
        message: "El monitor fue creado correctamente.",
      });
      const summary: DashboardMonitorSummaryDto = {
        id: newMonitor.id,
        name: newMonitor.name,
        url: newMonitor.url,
        currentStatus: newMonitor.status,
        lastCheckedAt: null,
        lastResponseTimeMs: null,
        uptimePercentage: null,
        totalChecks: 0,
        failedChecks: 0,
      };
      setMonitors((prev) =>
        [...prev, summary].sort((a, b) => a.name.localeCompare(b.name)),
      );
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to create monitor";
      setCreateError(message);
    } finally {
      setIsCreating(false);
    }
  }

  async function openEdit(id: string) {
    setEditError(null);
    setEditMonitor(null);
    setEditId(id);
    setEditOpen(true);
    setIsEditLoading(true);
    try {
      const data = await getMonitorById(id);
      setEditMonitor(data);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load monitor";
      setEditError(message);
    } finally {
      setIsEditLoading(false);
    }
  }

  async function handleEdit(values: MonitorFormValues) {
    if (!editId || !editMonitor) return;
    setEditError(null);
    setIsEditing(true);
    try {
      await updateMonitor(editId, values);
      setEditOpen(false);
      setFlash({
        tone: "success",
        title: "Monitor actualizado",
        message: "Los cambios fueron guardados.",
      });
      await load();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to update monitor";
      setEditError(message);
    } finally {
      setIsEditing(false);
    }
  }

  function openDelete(m: DashboardMonitorSummaryDto) {
    setDeleteTarget(m);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteMonitor(deleteTarget.id);
      setDeleteOpen(false);
      setDeleteTarget(null);
      setFlash({
        tone: "success",
        title: "Monitor eliminado",
        message: "El monitor fue eliminado.",
      });
      await load();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to delete monitor";
      setFlash({ tone: "error", title: "No se pudo eliminar", message });
    } finally {
      setIsDeleting(false);
    }
  }

  async function openNetInfo(m: DashboardMonitorSummaryDto) {
    setNetInfoTarget(m);
    setNetInfoOpen(true);
    setNetInfoLoading(true);
    setNetInfoError(null);
    setNetInfoData(null);
    try {
      const data = await getNetworkInfo(m.url);
      setNetInfoData(data);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "No se pudo cargar la información de red";
      setNetInfoError(message);
    } finally {
      setNetInfoLoading(false);
    }
  }

  useEffect(() => {
    document.title = "Cloud Alert Hub — Centro de Monitoreo";
  }, []);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 5000);
    return () => clearTimeout(timer);
  }, [flash]);

  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  useEffect(() => {
    const connection = createMonitoringConnection();

    connection.on("MonitorUpdated", (monitor: MonitorUpdatedEvent) => {
      setMonitors((prev) => {
        const current = prev.find((m) => m.id === monitor.id);
        const nextMonitor = mergeMonitorUpdate(current, monitor);

        if (!current) {
          return [...prev, nextMonitor].sort((a, b) =>
            a.name.localeCompare(b.name),
          );
        }

        return prev.map((item) =>
          item.id === monitor.id ? nextMonitor : item,
        );
      });
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
  }, []);

  usePolling(
    load,
    { intervalMs: REFRESH_MS, enabled: !isRealtimeConnected },
    [],
  );

  const stats = useMemo(() => computeStats(monitors), [monitors]);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Centro de Monitoreo
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                isRealtimeConnected
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-slate-600 bg-slate-800 text-slate-400 animate-pulse"
              }`}
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  isRealtimeConnected ? "bg-emerald-400" : "bg-slate-400"
                }`}
              />
              {isRealtimeConnected ? "Realtime" : "Conectando…"}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Panel de monitoreo y observabilidad · Actualización automática cada{" "}
            {Math.round(REFRESH_MS / 1000)}s
          </p>
        </div>
      </div>

      {flash ? (
        <StateBanner
          tone={flash.tone === "success" ? "success" : "error"}
          title={flash.title}
          message={flash.message}
        />
      ) : null}

      {error ? (
        <StateBanner
          tone="error"
          title="No se pudieron cargar los monitores"
          message={error}
        />
      ) : null}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Monitores totales"
          value={isLoading ? "—" : stats.total}
          subtitle="Monitores registrados"
          tone="neutral"
        />
        <StatCard
          title="En línea"
          value={isLoading ? "—" : stats.online}
          subtitle="Activos"
          tone="success"
        />
        <StatCard
          title="Fuera de línea"
          value={isLoading ? "—" : stats.offline}
          subtitle="Con fallas"
          tone="danger"
        />
        <StatCard
          title="Respuesta promedio"
          value={
            isLoading
              ? "—"
              : stats.averageResponseTimeMs != null
                ? `${Math.round(stats.averageResponseTimeMs)} ms`
                : "—"
          }
          subtitle="Última medición"
          tone="warning"
        />
      </div>

      {/* Monitors table */}
      <Card
        title="Monitores"
        right={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleManualRefresh} isLoading={isManualRefreshing}>
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7m0 0l3.181 3.182" /></svg>
                Actualizar
              </span>
            </Button>
            <Button variant="primary" onClick={openCreate}>
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Nuevo monitor
              </span>
            </Button>
          </div>
        }
      >
        {isLoading ? (
          <div className="flex items-center gap-3 py-8 text-sm text-slate-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-blue-400" />
            Cargando monitores…
          </div>
        ) : monitors.length === 0 ? (
          <div className="py-10 text-center">
            <div className="mx-auto inline-flex rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
              <svg className="h-6 w-6 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
            </div>
            <div className="mt-3 text-sm font-medium text-slate-300">
              No hay monitores aún
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Crea tu primer monitor para empezar a monitorear.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-700 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-3">Nombre</th>
                  <th className="px-3 py-3">URL</th>
                  <th className="px-3 py-3">Estado</th>
                  <th className="px-3 py-3">Última verificación</th>
                  <th className="px-3 py-3">Respuesta</th>
                  <th className="px-3 py-3">Uptime</th>
                  <th className="px-3 py-3">Checks</th>
                  <th className="px-3 py-3">Fallidos</th>
                  <th className="px-3 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {monitors.map((m) => (
                  <tr
                    key={m.id}
                    className="group transition-colors hover:bg-slate-800/40"
                  >
                    <td className="px-3 py-3">
                      <Link
                        to={`/monitors/${m.id}`}
                        className="font-medium text-white transition-colors hover:text-blue-400"
                      >
                        {m.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-slate-400">
                      <span
                        className="block max-w-[280px] truncate"
                        title={m.url}
                      >
                        {m.url}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={m.currentStatus} />
                    </td>
                    <td className="px-3 py-3 text-slate-400">
                      {m.lastCheckedAt ? formatDateTime(m.lastCheckedAt) : "—"}
                    </td>
                    <td className="px-3 py-3 text-slate-400">
                      {m.lastResponseTimeMs != null
                        ? `${m.lastResponseTimeMs} ms`
                        : "—"}
                    </td>
                    <td className="px-3 py-3 text-slate-300">
                      {m.uptimePercentage != null
                        ? `${m.uptimePercentage.toFixed(1)}%`
                        : "—"}
                    </td>
                    <td className="px-3 py-3 text-slate-300">{m.totalChecks}</td>
                    <td className="px-3 py-3">
                      <span
                        className={
                          (m.failedChecks ?? 0) > 0
                            ? "font-medium text-rose-400"
                            : "text-slate-300"
                        }
                      >
                        {m.failedChecks ?? 0}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 opacity-80 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/10 hover:text-blue-300"
                          onClick={() => void openNetInfo(m)}
                        >
                          WHOIS / SSL
                        </button>
                        <button
                          type="button"
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
                          onClick={() => void openEdit(m.id)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                          onClick={() => openDelete(m)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={createOpen}
        title="Crear monitor"
        onClose={() => setCreateOpen(false)}
      >
        <MonitorForm
          initialValues={{ name: "", url: "", intervalInSeconds: 60 }}
          submitLabel="Crear"
          isSubmitting={isCreating}
          error={createError}
          onCancel={() => setCreateOpen(false)}
          onSubmit={handleCreate}
        />
      </Modal>

      <Modal
        open={editOpen}
        title="Editar monitor"
        onClose={() => setEditOpen(false)}
      >
        {isEditLoading ? (
          <div className="text-sm text-gray-600">Cargando monitor…</div>
        ) : editMonitor ? (
          <MonitorForm
            initialValues={{
              name: editMonitor.name,
              url: editMonitor.url,
              intervalInSeconds: editMonitor.intervalInSeconds,
            }}
            submitLabel="Guardar cambios"
            isSubmitting={isEditing}
            error={editError}
            onCancel={() => setEditOpen(false)}
            onSubmit={handleEdit}
          />
        ) : (
          <StateBanner
            tone="error"
            title="No se pudo cargar el monitor"
            message={editError ?? "Error desconocido"}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar monitor"
        message={
          deleteTarget
            ? `¿Seguro que deseas eliminar “${deleteTarget.name}”? Esta acción no se puede deshacer.`
            : "¿Seguro que deseas eliminar este monitor?"
        }
        confirmLabel="Eliminar"
        isConfirmLoading={isDeleting}
        onConfirm={() => void confirmDelete()}
        onClose={() => setDeleteOpen(false)}
      />

      <Modal
        open={netInfoOpen}
        title={`Información de red — ${netInfoTarget?.name ?? ""}`}
        onClose={() => setNetInfoOpen(false)}
        size="lg"
      >
        {netInfoLoading ? (
          <div className="flex items-center gap-3 py-6 text-sm text-slate-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-blue-400" />
            Consultando WHOIS y certificado SSL…
          </div>
        ) : netInfoError ? (
          <StateBanner tone="error" title="Error" message={netInfoError} />
        ) : netInfoData ? (
          <div className="space-y-5">
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => downloadNetInfoCsv(netInfoData, netInfoTarget?.name ?? "monitor")}
                className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Descargar CSV
              </button>
            </div>

            {/* WHOIS Section */}
            {netInfoData.whois && (
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
                  <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  WHOIS
                </h4>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <InfoRow label="Dominio" value={netInfoData.whois.domainName} />
                    <InfoRow label="Registrar" value={netInfoData.whois.registrar} />
                    <InfoRow label="Registrado el" value={netInfoData.whois.registrationDate} />
                    <InfoRow label="Expira el" value={netInfoData.whois.expirationDate} />
                    <InfoRow label="Actualizado" value={netInfoData.whois.updatedDate} />
                    <InfoRow label="Registrante" value={netInfoData.whois.registrantName} />
                    <InfoRow label="Organización" value={netInfoData.whois.registrantOrganization} />
                    <InfoRow label="País" value={netInfoData.whois.registrantCountry} />
                    <InfoRow label="Name servers" value={netInfoData.whois.nameServers} />
                    <InfoRow label="DNSSEC" value={netInfoData.whois.dnssec} />
                    <InfoRow label="Estado" value={netInfoData.whois.status} />
                  </div>
                  {netInfoData.whois.ipAddresses.length > 0 && (
                    <div className="mt-3 border-t border-slate-800 pt-3">
                      <div className="text-xs font-medium text-slate-500">Direcciones IP resueltas</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {netInfoData.whois.ipAddresses.map((ip) => (
                          <span key={ip} className="rounded-full bg-blue-900/20 px-2.5 py-1 text-xs text-blue-300">
                            {ip}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SSL Certificate Section */}
            {netInfoData.sslCertificate && (
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
                  <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Certificado SSL
                </h4>
                <div className={`rounded-xl border p-4 text-sm ${netInfoData.sslCertificate.isValid ? "border-emerald-900/30 bg-emerald-950/10" : "border-rose-900/30 bg-rose-950/10"}`}>
                  <div className="mb-3 flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${netInfoData.sslCertificate.isValid ? "bg-emerald-500" : "bg-rose-500"}`} />
                    <span className={`text-xs font-semibold ${netInfoData.sslCertificate.isValid ? "text-emerald-300" : "text-rose-300"}`}>
                      {netInfoData.sslCertificate.isValid ? "Válido" : "Inválido o expirado"}
                    </span>
                    {netInfoData.sslCertificate.daysUntilExpiry > 0 && (
                      <span className="text-xs text-slate-400">
                        · Expira en {netInfoData.sslCertificate.daysUntilExpiry} días
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <InfoRow label="Subject" value={netInfoData.sslCertificate.subject} />
                    <InfoRow label="Issuer" value={netInfoData.sslCertificate.issuer} />
                    <InfoRow label="Serial" value={netInfoData.sslCertificate.serialNumber} />
                    <InfoRow label="Thumbprint" value={netInfoData.sslCertificate.thumbprint} />
                    <InfoRow label="Válido desde" value={netInfoData.sslCertificate.validFrom} />
                    <InfoRow label="Válido hasta" value={netInfoData.sslCertificate.validTo} />
                    <InfoRow label="Algoritmo" value={netInfoData.sslCertificate.signatureAlgorithm} />
                    <InfoRow label="Key length" value={netInfoData.sslCertificate.keyLength > 0 ? `${netInfoData.sslCertificate.keyLength} bits` : null} />
                  </div>
                  {netInfoData.sslCertificate.subjectAlternativeNames.length > 0 && (
                    <div className="mt-3 border-t border-slate-800 pt-3">
                      <div className="text-xs font-medium text-slate-500">Subject Alternative Names (SAN)</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {netInfoData.sslCertificate.subjectAlternativeNames.map((san) => (
                          <span key={san} className="rounded-full bg-emerald-900/20 px-2.5 py-1 text-xs text-emerald-300">
                            {san}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function downloadNetInfoCsv(data: NetworkInfoResponseDto, monitorName: string) {
  const rows: string[][] = [];
  if (data.whois) {
    rows.push(["WHOIS"])
    rows.push(["Campo", "Valor"]);
    rows.push(["Dominio", data.whois.domainName]);
    if (data.whois.registrar) rows.push(["Registrar", data.whois.registrar]);
    if (data.whois.registrationDate) rows.push(["Registrado el", data.whois.registrationDate]);
    if (data.whois.expirationDate) rows.push(["Expira el", data.whois.expirationDate]);
    if (data.whois.updatedDate) rows.push(["Actualizado", data.whois.updatedDate]);
    if (data.whois.registrantName) rows.push(["Registrante", data.whois.registrantName]);
    if (data.whois.registrantOrganization) rows.push(["Organización", data.whois.registrantOrganization]);
    if (data.whois.registrantCountry) rows.push(["País", data.whois.registrantCountry]);
    if (data.whois.nameServers) rows.push(["Name servers", data.whois.nameServers]);
    if (data.whois.dnssec) rows.push(["DNSSEC", data.whois.dnssec]);
    if (data.whois.status) rows.push(["Estado", data.whois.status]);
    if (data.whois.ipAddresses.length > 0) rows.push(["IPs", data.whois.ipAddresses.join("; ")]);
    rows.push([]);
  }
  if (data.sslCertificate) {
    rows.push(["Certificado SSL"]);
    rows.push(["Campo", "Valor"]);
    rows.push(["Subject", data.sslCertificate.subject]);
    rows.push(["Issuer", data.sslCertificate.issuer]);
    rows.push(["Serial", data.sslCertificate.serialNumber]);
    rows.push(["Thumbprint", data.sslCertificate.thumbprint]);
    rows.push(["Válido desde", data.sslCertificate.validFrom]);
    rows.push(["Válido hasta", data.sslCertificate.validTo]);
    rows.push(["Días para expirar", String(data.sslCertificate.daysUntilExpiry)]);
    rows.push(["Válido", data.sslCertificate.isValid ? "Sí" : "No"]);
    if (data.sslCertificate.signatureAlgorithm) rows.push(["Algoritmo", data.sslCertificate.signatureAlgorithm]);
    if (data.sslCertificate.keyLength > 0) rows.push(["Key length", `${data.sslCertificate.keyLength} bits`]);
    if (data.sslCertificate.subjectAlternativeNames.length > 0) rows.push(["SANs", data.sslCertificate.subjectAlternativeNames.join("; ")]);
  }

  function escapeCsvCell(v: string): string {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  }

  const csvContent = rows.map((r) => r.map(escapeCsvCell).join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `whois_ssl_${monitorName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (value == null || value === "") return null;
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 break-words text-slate-200">{value}</div>
    </div>
  );
}
