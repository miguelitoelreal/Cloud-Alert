import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getMyAlertPreferences,
  updateMyAlertPreferences,
  getCloudProviderOptions,
  sendTestAlert,
} from "../services/alerts";
import { getMonitors } from "../services/monitors";
import {
  SummaryFrequency,
  NotificationSeverity,
  EmailTemplateType,
  NotificationLanguage,
} from "../types/alerts";
import type { UserAlertPreference, CloudProviderOption } from "../types/alerts";
import type { MonitorResponseDto } from "../types/monitor";

const dayLabels = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const sevLabels: Record<number, string> = { 1: "Critico", 2: "Alto", 3: "Medio", 4: "Bajo" };
const sevCls: Record<number, string> = {
  1: "border-red-500/30 bg-red-500/10 text-red-400",
  2: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  3: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  4: "border-blue-500/30 bg-blue-500/10 text-blue-400",
};

const defs: UserAlertPreference = {
  emailEnabled: true,
  monitorDownAlerts: true,
  monitorRecoveredAlerts: true,
  highLatencyAlerts: false,
  certificateExpiringAlerts: true,
  certificateExpiredAlerts: true,
  cloudIncidentCriticalAlerts: true,
  cloudIncidentMajorAlerts: true,
  cloudIncidentMinorAlerts: false,
  scheduledMaintenanceAlerts: false,
  incidentResolvedAlerts: true,
  integrationErrorAlerts: false,
  cloudImportFailureAlerts: false,
  backgroundJobFailureAlerts: false,
  minimumSeverity: NotificationSeverity.Medium,
  selectedCloudProviderIds: [],
  monitorSelectionMode: "All",
  selectedMonitorIds: [],
  excludedMonitorIds: [],
  summaryEnabled: false,
  summaryFrequency: SummaryFrequency.Weekly,
  summaryDay: 1,
  summaryIncludeMonitors: true,
  summaryIncludeCloud: true,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
  quietHoursTimezone: "America/Lima",
  quietHoursExcludeWeekends: false,
  deduplicationMinutes: 15,
  groupSimilarIncidents: true,
  cooldownMinutes: 5,
  additionalEmails: [],
  emailTemplate: EmailTemplateType.Detailed,
  includeTimeline: true,
  includeMetrics: true,
  includeDirectLinks: true,
  includeCurrentStatus: true,
  language: NotificationLanguage.Spanish,
  customTenantName: undefined,
  customTenantLogoUrl: undefined,
  customTenantColor: undefined,
};

const Card = ({ title, desc, icon, children, right }: any) => (
  <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/60">
    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 px-5 py-3">
      {icon && <span className="text-blue-400">{icon}</span>}
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
        {desc && <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>}
      </div>
      {right}
    </div>
    <div className="px-5 py-4">{children}</div>
  </div>
);

const Sw = ({ c, on }: { c: boolean; on: (v: boolean) => void }) => (
  <label className="relative inline-flex cursor-pointer items-center">
    <input type="checkbox" checked={c} onChange={(e) => on(e.target.checked)} className="peer sr-only" />
    <div className="h-6 w-11 rounded-full bg-slate-700 peer-checked:bg-blue-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 dark:border-slate-700 after:bg-white dark:bg-slate-900/60 after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-blue-400" />
  </label>
);

export function AlertsPage() {
  const [p, setP] = useState<UserAlertPreference>(defs);
  const [providers, setProviders] = useState<CloudProviderOption[]>([]);
  const [monitors, setMonitors] = useState<MonitorResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [tab, setTab] = useState<"alerts" | "schedule" | "format">("alerts");
  const [emailIn, setEmailIn] = useState("");
  const [testType, setTestType] = useState<"auto" | "monitor" | "critical" | "major">("auto");
  const [isEditing, setIsEditing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [prefs, pro, mon] = await Promise.all([
        getMyAlertPreferences(),
        getCloudProviderOptions(),
        getMonitors(),
      ]);
      setP({ ...defs, ...prefs });
      // Fallback: si la API devuelve vacio (backend no reiniciado), mostrar proveedores conocidos
      const fallbackProviders: CloudProviderOption[] = [
        { id: "cloudflare", name: "Cloudflare" },
        { id: "github", name: "GitHub" },
        { id: "openai", name: "OpenAI" },
        { id: "vercel", name: "Vercel" },
        { id: "twilio", name: "Twilio" },
        { id: "digitalocean", name: "DigitalOcean" },
        { id: "microsoft-365", name: "Microsoft 365" },
        { id: "power-platform", name: "Power Platform" },
      ];
      setProviders(pro.length > 0 ? pro : fallbackProviders);
      setMonitors(mon);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al cargar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setErr(null);
    setOk(null);
    try {
      await updateMyAlertPreferences(p);
      setOk("Preferencias guardadas correctamente.");
      setIsEditing(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setErr(null);
    setOk(null);
    void load();
  };

  const test = async () => {
    setTesting(true);
    setErr(null);
    setOk(null);
    try {
      const r = await sendTestAlert(testType);
      setOk(`${r.message} — Destinatarios: ${r.recipients.join(", ")}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al enviar prueba.");
    } finally {
      setTesting(false);
    }
  };

  const upd = <K extends keyof UserAlertPreference>(k: K, v: UserAlertPreference[K]) =>
    setP((x) => ({ ...x, [k]: v }));

  const selP = (id: string) =>
    setP((x) => ({
      ...x,
      selectedCloudProviderIds: x.selectedCloudProviderIds.includes(id)
        ? x.selectedCloudProviderIds.filter((y) => y !== id)
        : [...x.selectedCloudProviderIds, id],
    }));

  const selM = (id: string, list: "selected" | "excluded") =>
    setP((x) => {
      const ids = new Set(list === "selected" ? x.selectedMonitorIds : x.excludedMonitorIds);
      const oth = new Set(list === "selected" ? x.excludedMonitorIds : x.selectedMonitorIds);
      if (ids.has(id)) ids.delete(id);
      else {
        ids.add(id);
        oth.delete(id);
      }
      return list === "selected"
        ? { ...x, selectedMonitorIds: [...ids], excludedMonitorIds: [...oth] }
        : { ...x, excludedMonitorIds: [...ids], selectedMonitorIds: [...oth] };
    });

  const addEmail = () => {
    const e = emailIn.trim();
    if (!e) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setErr("Email invalido.");
      return;
    }
    setP((x) => ({ ...x, additionalEmails: [...x.additionalEmails, e] }));
    setEmailIn("");
    setErr(null);
  };

  const rmEmail = (e: string) =>
    setP((x) => ({ ...x, additionalEmails: x.additionalEmails.filter((y) => y !== e) }));

  const testOpts = useMemo(() => {
    const o: { value: string; label: string }[] = [
      { value: "auto", label: "Auto (basado en preferencias)" },
    ];
    if (p.monitorDownAlerts) o.push({ value: "monitor", label: "Monitor caido" });
    if (p.cloudIncidentCriticalAlerts) o.push({ value: "critical", label: "Incidencia critica" });
    if (p.cloudIncidentMajorAlerts) o.push({ value: "major", label: "Incidencia mayor" });
    return o;
  }, [p]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-700" />
        <div className="h-4 w-96 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-5">
            <div className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-48 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
          <div className="space-y-5">
            <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  const off = !p.emailEnabled;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Suscripciones de Alerta
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {isEditing
              ? "Editando preferencias. Recuerda guardar cuando termines."
              : "Configura que eventos recibes por email, de que proveedores y con que frecuencia."}
          </p>
        </div>
        {isEditing ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setIsEditing(true); setErr(null); setOk(null); }}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-600/40 bg-blue-600/10 px-5 py-2.5 text-sm font-medium text-blue-400 hover:bg-blue-600/20"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar preferencias
          </button>
        )}
      </div>

      {err && (
        <div className="flex items-start gap-3 rounded-lg border border-red-900/40 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {err}
        </div>
      )}
      {ok && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-900/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          {ok}
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl border border-blue-900/30 bg-blue-900/20 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-900/30 text-blue-400">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Alertas por email</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {p.emailEnabled
                ? "Activadas. Recibiras notificaciones segun tu configuracion."
                : "Desactivadas. No recibiras ninguna alerta por email."}
            </p>
          </div>
        </div>
        <Sw c={p.emailEnabled} on={(v) => upd("emailEnabled", v)} />
      </div>

      <div className={`flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-1 ${off ? "pointer-events-none opacity-40" : ""} ${!isEditing ? "pointer-events-none select-none opacity-60" : ""}`}>
        {([
          { id: "alerts" as const, l: "Que recibir" },
          { id: "schedule" as const, l: "Cuando y como" },
          { id: "format" as const, l: "Formato y destinatarios" },
        ]).map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-b-2 border-blue-500 text-blue-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200"
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className={`xl:col-span-2 space-y-5 ${off ? "pointer-events-none opacity-40" : ""} ${!isEditing ? "pointer-events-none select-none opacity-60" : ""}`}>
          {tab === "alerts" && (
              <>
                <Card
                  title="Alertas de monitores"
                  desc="Eventos relacionados a tus monitores web e infraestructura."
                  right={<span className="text-[11px] text-slate-500">{[p.monitorDownAlerts, p.monitorRecoveredAlerts, p.highLatencyAlerts, p.certificateExpiringAlerts, p.certificateExpiredAlerts].filter(Boolean).length} activadas</span>}
                  icon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                  }
                >
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {[
                      { k: "monitorDownAlerts" as const, l: "Monitor caido", d: "Cuando un monitor deje de responder", s: 2 },
                      { k: "monitorRecoveredAlerts" as const, l: "Monitor recuperado", d: "Cuando un monitor vuelva a estar activo", s: 3 },
                      { k: "highLatencyAlerts" as const, l: "Latencia alta", d: "Respuesta lenta de monitores", s: 3 },
                      { k: "certificateExpiringAlerts" as const, l: "Certificado por expirar", d: "Alerta preventiva de SSL/TLS", s: 3 },
                      { k: "certificateExpiredAlerts" as const, l: "Certificado expirado", d: "SSL/TLS ya no es valido", s: 1 },
                    ].map((i) => (
                      <div key={i.k} className="flex items-start justify-between rounded-md p-2 hover:bg-slate-100 dark:bg-slate-800/40">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={p[i.k]}
                            onChange={(e) => upd(i.k, e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-blue-600"
                          />
                          <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{i.l}</p>
                            <p className="text-xs text-slate-500">{i.d}</p>
                          </div>
                        </div>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${sevCls[i.s]}`}>
                          {sevLabels[i.s]}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card
                  title="Alertas de proveedores cloud"
                  desc="Notificaciones automaticas de incidencias cloud."
                  right={
                    <Sw
                      c={p.cloudIncidentCriticalAlerts || p.cloudIncidentMajorAlerts || p.cloudIncidentMinorAlerts || p.scheduledMaintenanceAlerts || p.incidentResolvedAlerts || p.cloudImportFailureAlerts}
                      on={(v) =>
                        setP((x) => ({
                          ...x,
                          cloudIncidentCriticalAlerts: v,
                          cloudIncidentMajorAlerts: v,
                          cloudIncidentMinorAlerts: v,
                          scheduledMaintenanceAlerts: v,
                          incidentResolvedAlerts: v,
                          cloudImportFailureAlerts: v,
                        }))
                      }
                    />
                  }
                  icon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
                  }
                >
                  <div className="space-y-3">
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      Activa para recibir alertas de los proveedores cloud que selecciones. El sistema detecta automaticamente el proveedor afectado y el tipo de incidencia (critica, mayor, menor, mantenimiento o resuelta) segun la senal real del estado del servicio.
                    </p>
                    <div className="rounded-lg border border-slate-300 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800/40 px-3 py-2">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        No necesitas configurar cada tipo manualmente. Si una incidencia coincide con tus proveedores seleccionados y la severidad es igual o mayor a la minima configurada, recibiras la alerta automaticamente.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card
                  title="Alertas de integraciones y servicios"
                  desc="Eventos de integraciones, jobs y servicios en segundo plano."
                  right={<span className="text-[11px] text-slate-500">{[p.integrationErrorAlerts, p.backgroundJobFailureAlerts].filter(Boolean).length} activadas</span>}
                  icon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22v-5M9 8V2M15 8V2M18 8H6a4 4 0 0 0 0 8h12a4 4 0 0 0 0-8z"/></svg>
                  }
                >
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {[
                      { k: "integrationErrorAlerts" as const, l: "Error de integracion", d: "Fallos en integraciones configuradas", s: 2 },
                      { k: "backgroundJobFailureAlerts" as const, l: "Fallo de jobs/servicios", d: "Errores en procesos en segundo plano", s: 2 },
                    ].map((i) => (
                      <div key={i.k} className="flex items-start justify-between rounded-md p-2 hover:bg-slate-100 dark:bg-slate-800/40">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={p[i.k]}
                            onChange={(e) => upd(i.k, e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-blue-600"
                          />
                          <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{i.l}</p>
                            <p className="text-xs text-slate-500">{i.d}</p>
                          </div>
                        </div>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${sevCls[i.s]}`}>
                          {sevLabels[i.s]}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card
                  title="Severidad minima"
                  desc="Solo recibiras alertas desde esta severidad hacia arriba."
                  icon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                  }
                >
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => upd("minimumSeverity", s as NotificationSeverity)}
                        className={`inline-flex min-w-[72px] cursor-pointer items-center justify-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          p.minimumSeverity === s
                            ? sevCls[s]
                            : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800/60"
                        }`}
                      >
                        {sevLabels[s]}
                      </button>
                    ))}
                  </div>
                </Card>

                <Card
                  title="Proveedores cloud"
                  desc="De que proveedores recibes alertas. Si no seleccionas ninguno, recibiras de todos."
                  icon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
                  }
                >
                  {providers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {providers.map((pr) => (
                        <button
                          key={pr.id}
                          type="button"
                          onClick={() => selP(pr.id)}
                          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                            p.selectedCloudProviderIds.includes(pr.id)
                              ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800/60"
                          }`}
                        >
                          <span className={`h-2 w-2 rounded-full ${p.selectedCloudProviderIds.includes(pr.id) ? "bg-blue-500" : "bg-gray-300"}`} />
                          {pr.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">
                        No hay proveedores cloud configurados. Ve al{" "}
                        <Link to="/centro-estado-cloud" className="text-blue-400 underline">
                          Centro de Estado Cloud
                        </Link>{" "}
                        y presiona <strong>Re-ingestar todo</strong> para sincronizarlos.
                      </p>
                      <button
                        type="button"
                        onClick={load}
                        className="rounded-md bg-slate-700 px-2 py-1 text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-600"
                      >
                        Reintentar cargar
                      </button>
                    </div>
                  )}
                </Card>

                <Card
                  title="Monitores especificos"
                  desc="Controla que monitores generan alertas."
                  icon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                  }
                >
                  <div className="flex gap-2">
                    {(["All", "Selected", "Excluded"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => upd("monitorSelectionMode", m)}
                        className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          p.monitorSelectionMode === m
                            ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                            : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800/60"
                        }`}
                      >
                        {m === "All" ? "Todos" : m === "Selected" ? "Solo seleccionados" : "Excluir algunos"}
                      </button>
                    ))}
                  </div>
                  {monitors.length === 0 ? (
                    <p className="mt-3 text-xs text-slate-500">No hay monitores configurados todavia.</p>
                  ) : (
                    p.monitorSelectionMode !== "All" && (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {p.monitorSelectionMode === "Selected"
                            ? "Selecciona los monitores que quieres incluir:"
                            : "Selecciona los monitores que quieres excluir:"}
                        </p>
                        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                          {monitors.map((m) => {
                            const inList =
                              p.monitorSelectionMode === "Selected"
                                ? p.selectedMonitorIds.includes(m.id)
                                : p.excludedMonitorIds.includes(m.id);
                            return (
                              <label
                                key={m.id}
                                className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 hover:bg-slate-100 dark:bg-slate-800/40"
                              >
                                <input
                                  type="checkbox"
                                  checked={inList}
                                  onChange={() =>
                                    selM(m.id, p.monitorSelectionMode === "Selected" ? "selected" : "excluded")
                                  }
                                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-blue-600"
                                />
                                <span className="text-xs text-slate-700 dark:text-slate-300">{m.name}</span>
                                <span
                                  className={`ml-auto h-2 w-2 rounded-full ${
                                    m.status === 1 ? "bg-emerald-500" : m.status === 2 ? "bg-red-500" : "bg-slate-600"
                                  }`}
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )
                  )}
                </Card>
              </>
            )}

            {tab === "schedule" && (
              <>
                <Card
                  title="Horarios silenciosos"
                  desc="No enviar alertas durante este rango horario."
                  icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
                  right={<Sw c={p.quietHoursEnabled} on={(v) => upd("quietHoursEnabled", v)} />}
                >
                  {p.quietHoursEnabled && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Inicio</label>
                        <input type="time" value={p.quietHoursStart} onChange={(e) => upd("quietHoursStart", e.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Fin</label>
                        <input type="time" value={p.quietHoursEnd} onChange={(e) => upd("quietHoursEnd", e.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Zona horaria</label>
                        <input type="text" value={p.quietHoursTimezone} onChange={(e) => upd("quietHoursTimezone", e.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100" />
                      </div>
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 sm:col-span-3">
                        <input type="checkbox" checked={p.quietHoursExcludeWeekends} onChange={(e) => upd("quietHoursExcludeWeekends", e.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700 text-blue-600" />
                        No aplicar horario silencioso los fines de semana
                      </label>
                    </div>
                  )}
                </Card>

                <Card
                  title="Anti-spam / Deduplicacion"
                  desc="Controla la frecuencia de alertas repetidas."
                  icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">No repetir alerta (min)</label>
                      <input type="number" min={1} max={1440} value={p.deduplicationMinutes} onChange={(e) => upd("deduplicationMinutes", Number(e.target.value))} className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Cooldown entre alertas (min)</label>
                      <input type="number" min={1} max={1440} value={p.cooldownMinutes} onChange={(e) => upd("cooldownMinutes", Number(e.target.value))} className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100" />
                    </div>
                    <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 sm:col-span-3">
                      <input type="checkbox" checked={p.groupSimilarIncidents} onChange={(e) => upd("groupSimilarIncidents", e.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700 text-blue-600" />
                      Agrupar incidencias similares en un solo email
                    </label>
                  </div>
                </Card>

                <Card
                  title="Resumen de alertas"
                  desc="Recibe un resumen periodico con todas las alertas."
                  icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>}
                  right={<Sw c={p.summaryEnabled} on={(v) => upd("summaryEnabled", v)} />}
                >
                  {p.summaryEnabled && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Frecuencia</label>
                        <select value={p.summaryFrequency} onChange={(e) => upd("summaryFrequency", Number(e.target.value) as SummaryFrequency)} className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100">
                          <option value={SummaryFrequency.Instant}>Instantaneo</option>
                          <option value={SummaryFrequency.Every15Min}>Cada 15 min</option>
                          <option value={SummaryFrequency.Hourly}>Cada 1 hora</option>
                          <option value={SummaryFrequency.Daily}>Diario</option>
                          <option value={SummaryFrequency.Weekly}>Semanal</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Dia de envio</label>
                        <select value={p.summaryDay} onChange={(e) => upd("summaryDay", Number(e.target.value))} className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100">
                          {dayLabels.map((d, i) => (
                            <option key={i} value={i}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 sm:col-span-2">
                        <input type="checkbox" checked={p.summaryIncludeMonitors} onChange={(e) => upd("summaryIncludeMonitors", e.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700 text-blue-600" />
                        Incluir estado de monitores en el resumen
                      </label>
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 sm:col-span-2">
                        <input type="checkbox" checked={p.summaryIncludeCloud} onChange={(e) => upd("summaryIncludeCloud", e.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700 text-blue-600" />
                        Incluir incidencias cloud en el resumen
                      </label>
                    </div>
                  )}
                </Card>
              </>
            )}

            {tab === "format" && (
              <>
                <Card
                  title="Plantilla de email"
                  desc="Elige el formato de los emails de alerta."
                  icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>}
                >
                  <div className="flex flex-wrap gap-2">
                    {([
                      { v: EmailTemplateType.Compact, l: "Compacto" },
                      { v: EmailTemplateType.Detailed, l: "Detallado" },
                    ]).map((t) => (
                      <button key={t.v} type="button" onClick={() => upd("emailTemplate", t.v)} className={`inline-flex min-w-[72px] cursor-pointer items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${p.emailTemplate === t.v ? "border-blue-500/30 bg-blue-500/10 text-blue-400" : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800/60"}`}>
                        {t.l}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 space-y-1">
                    {[
                      { k: "includeTimeline" as const, l: "Incluir timeline de eventos" },
                      { k: "includeMetrics" as const, l: "Incluir metricas relevantes" },
                      { k: "includeDirectLinks" as const, l: "Incluir enlaces directos" },
                      { k: "includeCurrentStatus" as const, l: "Incluir estado actual" },
                    ].map((i) => (
                      <label key={i.k} className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 hover:bg-slate-100 dark:bg-slate-800/40">
                        <input type="checkbox" checked={p[i.k]} onChange={(e) => upd(i.k, e.target.checked)} className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-blue-600" />
                        <span className="text-xs text-slate-700 dark:text-slate-300">{i.l}</span>
                      </label>
                    ))}
                  </div>
                </Card>

                <Card
                  title="Idioma"
                  desc="Idioma de las notificaciones por email."
                  icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
                >
                  <div className="flex flex-wrap gap-2">
                    {([
                      { v: NotificationLanguage.Spanish, l: "Espanol" },
                      { v: NotificationLanguage.English, l: "English" },
                    ]).map((l) => (
                      <button key={l.v} type="button" onClick={() => upd("language", l.v)} className={`inline-flex min-w-[72px] cursor-pointer items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${p.language === l.v ? "border-blue-500/30 bg-blue-500/10 text-blue-400" : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800/60"}`}>
                        {l.l}
                      </button>
                    ))}
                  </div>
                </Card>

                <Card
                  title="Destinatarios adicionales"
                  desc="Agrega emails adicionales que recibiran las alertas."
                  icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
                >
                  <div className="flex gap-2">
                    <input type="email" value={emailIn} onChange={(e) => setEmailIn(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEmail(); } }}
                      placeholder="email@ejemplo.com" className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-600" />
                    <button type="button" onClick={addEmail} className="rounded-md bg-slate-700 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-600">Agregar</button>
                  </div>
                  {p.additionalEmails.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {p.additionalEmails.map((e) => (
                        <span key={e} className="inline-flex items-center gap-1 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300">
                          {e}
                          <button type="button" onClick={() => rmEmail(e)} className="ml-1 text-slate-500 hover:text-red-400">x</button>
                        </span>
                      ))}
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>

          <div className="space-y-5">
            {!isEditing && (
              <Card title="Probar alertas" desc="Verifica que tu configuracion funciona." icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}>
                <div className="space-y-3">
                  {p.emailEnabled && testOpts.length > 0 ? (
                    <>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Tipo de alerta de prueba</label>
                      <select value={testType} onChange={(e) => setTestType(e.target.value as any)} className="block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100">
                        {testOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <button type="button" onClick={test} disabled={testing} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                        {testing ? "Enviando..." : "Enviar alerta de prueba"}
                      </button>
                    </>
                  ) : (
                    <p className="text-xs text-slate-500">Activa las alertas por email y selecciona al menos un tipo de alerta para probar.</p>
                  )}
                </div>
              </Card>
            )}

            <Card title="Como funciona" desc="Resumen del comportamiento de alertas." icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>}>
              <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />El sistema revisa incidencias cada 5 minutos.</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />Solo alerta si tienes activado ese tipo + proveedor.</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />Misma alerta no se repite en el tiempo configurado.</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />Respeta horarios silenciosos si los configuras.</li>
              </ul>
            </Card>
          </div>
        </div>
    </div>
  );
}
