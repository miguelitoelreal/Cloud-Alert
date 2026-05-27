import { useCallback, useEffect, useState } from "react";
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
const freqLabels: Record<number, string> = {
  0: "Instantaneo",
  1: "Cada 15 min",
  2: "Cada 1 hora",
  3: "Diario",
  4: "Semanal",
};
const severityLabels: Record<number, string> = { 1: "Critical", 2: "High", 3: "Medium", 4: "Low" };
const severityColors: Record<number, string> = {
  1: "bg-red-500/10 text-red-400 border-red-500/30",
  2: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  3: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  4: "bg-blue-500/10 text-blue-400 border-blue-500/30",
};

type TestOption = { value: "auto" | "monitor" | "critical" | "major"; label: string };

const defaultPreferences: UserAlertPreference = {
  emailEnabled: false,
  monitorDownAlerts: true,
  monitorRecoveredAlerts: true,
  highLatencyAlerts: false,
  certificateExpiringAlerts: false,
  certificateExpiredAlerts: false,
  cloudIncidentCriticalAlerts: true,
  cloudIncidentMajorAlerts: true,
  cloudIncidentMinorAlerts: false,
  scheduledMaintenanceAlerts: false,
  incidentResolvedAlerts: false,
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

export function AlertsPage() {
  const [preferences, setPreferences] = useState<UserAlertPreference>(defaultPreferences);
  const [savedPreferences, setSavedPreferences] = useState<UserAlertPreference | null>(null);
  const [cloudProviders, setCloudProviders] = useState<CloudProviderOption[]>([]);
  const [monitors, setMonitors] = useState<MonitorResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testAlertType, setTestAlertType] = useState<"auto" | "monitor" | "critical" | "major">("auto");
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "advanced" | "template">("general");
  const [emailInput, setEmailInput] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prefs, providers, monitorsData] = await Promise.all([
        getMyAlertPreferences(),
        getCloudProviderOptions(),
        getMonitors(),
      ]);
      const merged = { ...defaultPreferences, ...prefs };
      setPreferences(merged);
      setSavedPreferences(merged);
      setCloudProviders(providers);
      setMonitors(monitorsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las preferencias.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateMyAlertPreferences(preferences);
      setSavedPreferences({ ...preferences });
      setSuccess("Preferencias guardadas correctamente.");
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar las preferencias.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestAlert() {
    setTesting(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await sendTestAlert(testAlertType);
      setSuccess(`${result.message} Destinatarios: ${result.recipients.join(", ")}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la alerta de prueba.");
    } finally {
      setTesting(false);
    }
  }

  function handleEdit() {
    setIsEditing(true);
    setSuccess(null);
    setError(null);
  }

  function handleCancelEdit() {
    if (savedPreferences) {
      setPreferences({ ...savedPreferences });
    }
    setIsEditing(false);
    setError(null);
    setSuccess(null);
    setEmailInput("");
  }

  function handleAddEmail() {
    const email = emailInput.trim();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Email invalido");
      return;
    }
    setPreferences((p) => ({
      ...p,
      additionalEmails: [...p.additionalEmails, email],
    }));
    setEmailInput("");
    setError(null);
  }

  function handleRemoveEmail(email: string) {
    setPreferences((p) => ({
      ...p,
      additionalEmails: p.additionalEmails.filter((e) => e !== email),
    }));
  }

  function toggleProvider(id: string) {
    setPreferences((p) => {
      const ids = new Set(p.selectedCloudProviderIds);
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      return { ...p, selectedCloudProviderIds: Array.from(ids) };
    });
  }

  function toggleMonitor(id: string, list: "selected" | "excluded") {
    setPreferences((p) => {
      if (list === "selected") {
        const ids = new Set(p.selectedMonitorIds);
        const otherIds = new Set(p.excludedMonitorIds);
        if (ids.has(id)) ids.delete(id);
        else {
          ids.add(id);
          otherIds.delete(id);
        }
        return { ...p, selectedMonitorIds: Array.from(ids), excludedMonitorIds: Array.from(otherIds) };
      } else {
        const ids = new Set(p.excludedMonitorIds);
        const otherIds = new Set(p.selectedMonitorIds);
        if (ids.has(id)) ids.delete(id);
        else {
          ids.add(id);
          otherIds.delete(id);
        }
        return { ...p, excludedMonitorIds: Array.from(ids), selectedMonitorIds: Array.from(otherIds) };
      }
    });
  }

  const enabledTestOptions: TestOption[] = [{ value: "auto", label: "Auto (basado en mis preferencias)" }];
  if (preferences.monitorDownAlerts) enabledTestOptions.push({ value: "monitor", label: "Monitor caido" });
  if (preferences.cloudIncidentCriticalAlerts) enabledTestOptions.push({ value: "critical", label: "Incidencia critica" });
  if (preferences.cloudIncidentMajorAlerts) enabledTestOptions.push({ value: "major", label: "Incidencia mayor" });

  const selectedProviderNames = cloudProviders
    .filter((p) => preferences.selectedCloudProviderIds.includes(p.id))
    .map((p) => p.name);

  const alertTypeItems = [
    { key: "monitorDownAlerts" as const, label: "Monitor caido", desc: "Cuando un monitor deje de responder", severity: 2 },
    { key: "monitorRecoveredAlerts" as const, label: "Monitor recuperado", desc: "Cuando un monitor vuelva a estar activo", severity: 3 },
    { key: "highLatencyAlerts" as const, label: "Latencia alta", desc: "Respuesta lenta de monitores", severity: 3 },
    { key: "certificateExpiringAlerts" as const, label: "Certificado proximo a expirar", desc: "Alerta preventiva de SSL/TLS", severity: 3 },
    { key: "certificateExpiredAlerts" as const, label: "Certificado expirado", desc: "SSL/TLS ya no es valido", severity: 1 },
    { key: "cloudIncidentCriticalAlerts" as const, label: "Incidentes cloud criticos", desc: "Problemas graves de proveedores cloud", severity: 1 },
    { key: "cloudIncidentMajorAlerts" as const, label: "Incidentes cloud mayores", desc: "Interrupciones significativas cloud", severity: 2 },
    { key: "cloudIncidentMinorAlerts" as const, label: "Incidentes cloud menores", desc: "Problemas menores de proveedores cloud", severity: 4 },
    { key: "scheduledMaintenanceAlerts" as const, label: "Mantenimiento programado", desc: "Ventanas de mantenimiento anunciadas", severity: 3 },
    { key: "incidentResolvedAlerts" as const, label: "Incidentes resueltos", desc: "Notificacion de resolucion", severity: 3 },
    { key: "integrationErrorAlerts" as const, label: "Errores de integraciones", desc: "Fallos en integraciones configuradas", severity: 2 },
    { key: "cloudImportFailureAlerts" as const, label: "Fallos de importacion cloud", desc: "Errores al sincronizar datos cloud", severity: 2 },
    { key: "backgroundJobFailureAlerts" as const, label: "Fallos de jobs/servicios", desc: "Errores en procesos en segundo plano", severity: 2 },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-700" />
        <div className="h-4 w-80 animate-pulse rounded bg-slate-800" />
        <div className="h-96 max-w-5xl animate-pulse rounded-xl bg-slate-800" />
      </div>
    );
  }

  const isLocked = !isEditing && savedPreferences !== null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Centro de Notificaciones</h1>
          <p className="mt-1 text-sm text-slate-400">
            Personaliza que eventos recibes, como los recibes y cuando.
          </p>
        </div>
        {isLocked && (
          <button
            type="button"
            onClick={handleEdit}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-600/30 bg-blue-600/10 px-4 py-2 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-600/20"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar preferencias
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-900/40 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-900/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          {success}
        </div>
      )}

      {/* Master toggle */}
      <div className={`flex items-center justify-between rounded-xl border px-5 py-4 ${isLocked && !preferences.emailEnabled ? 'border-slate-700 bg-slate-900/40 opacity-60' : 'border-blue-900/30 bg-blue-900/20'}`}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-900/30 text-blue-400">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">Alertas por email</p>
            <p className="text-xs text-slate-400">
              {preferences.emailEnabled ? "Activadas — recibiras notificaciones segun tu configuracion" : "Desactivadas — no recibiras ningun email"}
            </p>
          </div>
        </div>
        {isEditing ? (
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={preferences.emailEnabled}
              onChange={(e) => setPreferences((p) => ({ ...p, emailEnabled: e.target.checked }))}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-slate-700 peer-checked:bg-blue-600 peer-focus:ring-4 peer-focus:ring-blue-900/40 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-700 after:bg-slate-900/60 after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-blue-400" />
          </label>
        ) : (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${preferences.emailEnabled ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-700 text-slate-400'}`}>
            {preferences.emailEnabled ? "ON" : "OFF"}
          </span>
        )}
      </div>

      {!preferences.emailEnabled && (
        <div className="rounded-md border border-amber-900/30 bg-amber-900/20 px-4 py-3 text-xs text-amber-300">
          Las alertas por email estan desactivadas. Activalas para configurar el resto de opciones.
        </div>
      )}

      {preferences.emailEnabled && (
        <>
          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-800 pb-1">
            {([
              { id: "general", label: "General" },
              { id: "advanced", label: "Avanzado" },
              { id: "template", label: "Plantilla e Idioma" },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-b-2 border-blue-500 text-blue-400"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2 space-y-5">
              {activeTab === "general" && (
                <>
                  {/* Alert types */}
                  <div className="rounded-xl border border-slate-700 bg-slate-900/60">
                    <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-3">
                      <svg className="h-4 w-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-200">Tipos de alerta</h3>
                        <p className="text-xs text-slate-400">Eventos que te notifican por email</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-1 px-5 py-3 sm:grid-cols-2">
                      {alertTypeItems.map((item) => {
                        const isOn = preferences[item.key];
                        return (
                          <div key={item.key} className="flex items-start justify-between rounded-md p-2 hover:bg-slate-800/40">
                            <div className="flex items-start gap-3">
                              {isEditing ? (
                                <input
                                  type="checkbox"
                                  checked={isOn}
                                  onChange={(e) => setPreferences((p) => ({ ...p, [item.key]: e.target.checked }))}
                                  className="mt-0.5 h-4 w-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                                />
                              ) : (
                                <span className={`mt-0.5 inline-block h-4 w-4 rounded-full ${isOn ? "bg-blue-500" : "bg-slate-700"}`} />
                              )}
                              <div>
                                <p className="text-sm font-medium text-slate-300">{item.label}</p>
                                <p className="text-xs text-slate-500">{item.desc}</p>
                              </div>
                            </div>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${severityColors[item.severity]}`}>
                              {severityLabels[item.severity]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Minimum severity */}
                  <div className="rounded-xl border border-slate-700 bg-slate-900/60">
                    <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-3">
                      <svg className="h-4 w-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-200">Severidad minima</h3>
                        <p className="text-xs text-slate-400">Solo alertar desde esta severidad hacia arriba</p>
                      </div>
                    </div>
                    <div className="px-5 py-3">
                      {isEditing ? (
                        <div className="flex flex-wrap gap-2">
                          {[1, 2, 3, 4].map((sev) => (
                            <label
                              key={sev}
                              className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                                preferences.minimumSeverity === sev
                                  ? severityColors[sev]
                                  : "border-slate-700 bg-slate-900/40 text-slate-400 hover:bg-slate-800/60"
                              }`}
                            >
                              <input
                                type="radio"
                                name="minSeverity"
                                value={sev}
                                checked={preferences.minimumSeverity === sev}
                                onChange={() => setPreferences((p) => ({ ...p, minimumSeverity: sev as NotificationSeverity }))}
                                className="sr-only"
                              />
                              {severityLabels[sev]}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${severityColors[preferences.minimumSeverity]}`}>
                          {severityLabels[preferences.minimumSeverity]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cloud providers */}
                  {cloudProviders.length > 0 && (
                    <div className="rounded-xl border border-slate-700 bg-slate-900/60">
                      <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-3">
                        <svg className="h-4 w-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-200">Proveedores cloud</h3>
                          <p className="text-xs text-slate-400">De que proveedores recibes alertas</p>
                        </div>
                      </div>
                      <div className="px-5 py-3">
                        {isEditing ? (
                          <div className="flex flex-wrap gap-2">
                            {cloudProviders.map((provider) => (
                              <label
                                key={provider.id}
                                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                                  preferences.selectedCloudProviderIds.includes(provider.id)
                                    ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                                    : "border-slate-700 bg-slate-900/40 text-slate-400 hover:bg-slate-800/60"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={preferences.selectedCloudProviderIds.includes(provider.id)}
                                  onChange={() => toggleProvider(provider.id)}
                                  className="sr-only"
                                />
                                <span className={`h-2 w-2 rounded-full ${preferences.selectedCloudProviderIds.includes(provider.id) ? "bg-blue-500" : "bg-gray-300"}`} />
                                {provider.name}
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {selectedProviderNames.length > 0 ? (
                              selectedProviderNames.map((name) => (
                                <span key={name} className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400">
                                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                                  {name}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-500">Ninguno seleccionado</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Monitors */}
                  <div className="rounded-xl border border-slate-700 bg-slate-900/60">
                    <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-3">
                      <svg className="h-4 w-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-200">Monitores especificos</h3>
                        <p className="text-xs text-slate-400">Controla que monitores generan alertas</p>
                      </div>
                    </div>
                    <div className="px-5 py-3 space-y-3">
                      {isEditing ? (
                        <div className="flex gap-2">
                          {(["All", "Selected", "Excluded"] as const).map((mode) => (
                            <label
                              key={mode}
                              className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                                preferences.monitorSelectionMode === mode
                                  ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                                  : "border-slate-700 bg-slate-900/40 text-slate-400 hover:bg-slate-800/60"
                              }`}
                            >
                              <input
                                type="radio"
                                name="monitorMode"
                                value={mode}
                                checked={preferences.monitorSelectionMode === mode}
                                onChange={() => setPreferences((p) => ({ ...p, monitorSelectionMode: mode }))}
                                className="sr-only"
                              />
                              {mode === "All" ? "Todos" : mode === "Selected" ? "Solo seleccionados" : "Excluir algunos"}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-300">
                          {preferences.monitorSelectionMode === "All" ? "Todos los monitores" :
                           preferences.monitorSelectionMode === "Selected" ? "Solo monitores seleccionados" :
                           "Excluir monitores especificos"}
                        </span>
                      )}

                      {monitors.length === 0 ? (
                        <p className="text-xs text-slate-500">No hay monitores configurados todavia.</p>
                      ) : preferences.monitorSelectionMode !== "All" && (
                        <div className="space-y-1">
                          <p className="text-xs text-slate-400">
                            {preferences.monitorSelectionMode === "Selected"
                              ? "Selecciona los monitores que quieres incluir:"
                              : "Selecciona los monitores que quieres excluir:"}
                          </p>
                          {isEditing ? (
                            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                              {monitors.map((m) => {
                                const isInList = preferences.monitorSelectionMode === "Selected"
                                  ? preferences.selectedMonitorIds.includes(m.id)
                                  : preferences.excludedMonitorIds.includes(m.id);
                                return (
                                  <label
                                    key={m.id}
                                    className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 hover:bg-slate-800/40"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isInList}
                                      onChange={() => toggleMonitor(m.id, preferences.monitorSelectionMode === "Selected" ? "selected" : "excluded")}
                                      className="h-4 w-4 rounded border-slate-700 text-blue-600"
                                    />
                                    <span className="text-xs text-slate-300">{m.name}</span>
                                    <span className={`ml-auto h-2 w-2 rounded-full ${m.status === 1 ? "bg-emerald-500" : m.status === 2 ? "bg-red-500" : "bg-slate-600"}`} />
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {(preferences.monitorSelectionMode === "Selected"
                                ? preferences.selectedMonitorIds
                                : preferences.excludedMonitorIds
                              ).map((id) => {
                                const m = monitors.find((mon) => mon.id === id);
                                return m ? (
                                  <span key={id} className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs text-blue-400">
                                    {m.name}
                                  </span>
                                ) : (
                                  <span key={id} className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-400">
                                    {id.slice(0, 8)}...
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {activeTab === "advanced" && (
                <>
                  {/* Quiet hours */}
                  <div className="rounded-xl border border-slate-700 bg-slate-900/60">
                    <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-3">
                      <svg className="h-4 w-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-slate-200">Horarios silenciosos</h3>
                        <p className="text-xs text-slate-400">No enviar alertas en este rango horario</p>
                      </div>
                      {isEditing ? (
                        <label className="relative inline-flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={preferences.quietHoursEnabled}
                            onChange={(e) => setPreferences((p) => ({ ...p, quietHoursEnabled: e.target.checked }))}
                            className="peer sr-only"
                          />
                          <div className="h-6 w-11 rounded-full bg-slate-700 peer-checked:bg-blue-600 peer-focus:ring-4 peer-focus:ring-blue-900/40 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-700 after:bg-slate-900/60 after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-blue-400" />
                        </label>
                      ) : (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${preferences.quietHoursEnabled ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-700 text-slate-400'}`}>
                          {preferences.quietHoursEnabled ? "ON" : "OFF"}
                        </span>
                      )}
                    </div>
                    {preferences.quietHoursEnabled && (
                      <div className="space-y-3 px-5 py-3">
                        {isEditing ? (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-400">Inicio</label>
                              <input
                                type="time"
                                value={preferences.quietHoursStart}
                                onChange={(e) => setPreferences((p) => ({ ...p, quietHoursStart: e.target.value }))}
                                className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-400">Fin</label>
                              <input
                                type="time"
                                value={preferences.quietHoursEnd}
                                onChange={(e) => setPreferences((p) => ({ ...p, quietHoursEnd: e.target.value }))}
                                className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-400">Zona horaria</label>
                              <input
                                type="text"
                                value={preferences.quietHoursTimezone}
                                onChange={(e) => setPreferences((p) => ({ ...p, quietHoursTimezone: e.target.value }))}
                                className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                              />
                            </div>
                            <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 sm:col-span-3">
                              <input
                                type="checkbox"
                                checked={preferences.quietHoursExcludeWeekends}
                                onChange={(e) => setPreferences((p) => ({ ...p, quietHoursExcludeWeekends: e.target.checked }))}
                                className="h-3.5 w-3.5 rounded border-slate-700 text-blue-600"
                              />
                              No aplicar horario silencioso los fines de semana
                            </label>
                          </div>
                        ) : (
                          <div className="space-y-2 text-sm text-slate-300">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">Rango:</span>
                              <span>{preferences.quietHoursStart} - {preferences.quietHoursEnd}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">Zona horaria:</span>
                              <span>{preferences.quietHoursTimezone}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">Fines de semana:</span>
                              <span>{preferences.quietHoursExcludeWeekends ? "Libres (no aplica)" : "Aplica tambien"}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Anti-spam */}
                  <div className="rounded-xl border border-slate-700 bg-slate-900/60">
                    <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-3">
                      <svg className="h-4 w-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-200">Anti-spam / Deduplicacion</h3>
                        <p className="text-xs text-slate-400">Controla la frecuencia de alertas repetidas</p>
                      </div>
                    </div>
                    <div className="space-y-4 px-5 py-3">
                      {isEditing ? (
                        <>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-400">No repetir alerta (min)</label>
                              <input
                                type="number"
                                min={1}
                                max={1440}
                                value={preferences.deduplicationMinutes}
                                onChange={(e) => setPreferences((p) => ({ ...p, deduplicationMinutes: Number(e.target.value) }))}
                                className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-400">Cooldown (min)</label>
                              <input
                                type="number"
                                min={1}
                                max={1440}
                                value={preferences.cooldownMinutes}
                                onChange={(e) => setPreferences((p) => ({ ...p, cooldownMinutes: Number(e.target.value) }))}
                                className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                              />
                            </div>
                          </div>
                          <label className="inline-flex items-center gap-1.5 text-xs text-slate-300">
                            <input
                              type="checkbox"
                              checked={preferences.groupSimilarIncidents}
                              onChange={(e) => setPreferences((p) => ({ ...p, groupSimilarIncidents: e.target.checked }))}
                              className="h-3.5 w-3.5 rounded border-slate-700 text-blue-600"
                            />
                            Agrupar incidentes similares en un solo email
                          </label>
                        </>
                      ) : (
                        <div className="space-y-2 text-sm text-slate-300">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Deduplicacion:</span>
                            <span>{preferences.deduplicationMinutes} minutos</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Cooldown:</span>
                            <span>{preferences.cooldownMinutes} minutos</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Agrupar similares:</span>
                            <span>{preferences.groupSimilarIncidents ? "Si" : "No"}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="rounded-xl border border-slate-700 bg-slate-900/60">
                    <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-3">
                      <svg className="h-4 w-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-slate-200">Resumen de alertas</h3>
                        <p className="text-xs text-slate-400">Resumen periodico por email</p>
                      </div>
                      {isEditing ? (
                        <label className="relative inline-flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={preferences.summaryEnabled}
                            onChange={(e) => setPreferences((p) => ({ ...p, summaryEnabled: e.target.checked }))}
                            className="peer sr-only"
                          />
                          <div className="h-6 w-11 rounded-full bg-slate-700 peer-checked:bg-blue-600 peer-focus:ring-4 peer-focus:ring-blue-900/40 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-700 after:bg-slate-900/60 after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-blue-400" />
                        </label>
                      ) : (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${preferences.summaryEnabled ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-700 text-slate-400'}`}>
                          {preferences.summaryEnabled ? "Activado" : "Desactivado"}
                        </span>
                      )}
                    </div>
                    {preferences.summaryEnabled && (
                      <div className="space-y-3 px-5 py-3">
                        {isEditing ? (
                          <>
                            <div className="flex flex-wrap items-center gap-3">
                              <div>
                                <label className="block text-xs font-medium text-slate-400">Frecuencia</label>
                                <select
                                  value={preferences.summaryFrequency}
                                  onChange={(e) => setPreferences((p) => ({ ...p, summaryFrequency: Number(e.target.value) as SummaryFrequency }))}
                                  className="mt-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                                >
                                  <option value={SummaryFrequency.Instant}>Instantaneo</option>
                                  <option value={SummaryFrequency.Every15Min}>Cada 15 min</option>
                                  <option value={SummaryFrequency.Hourly}>Cada 1 hora</option>
                                  <option value={SummaryFrequency.Daily}>Diario</option>
                                  <option value={SummaryFrequency.Weekly}>Semanal</option>
                                </select>
                              </div>
                              {preferences.summaryFrequency >= SummaryFrequency.Daily && (
                                <div>
                                  <label className="block text-xs font-medium text-slate-400">Dia de envio</label>
                                  <select
                                    value={preferences.summaryDay}
                                    onChange={(e) => setPreferences((p) => ({ ...p, summaryDay: Number(e.target.value) }))}
                                    className="mt-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                                  >
                                    {dayLabels.map((d, i) => <option key={i} value={i}>{d}</option>)}
                                  </select>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                              <label className="inline-flex items-center gap-1.5 text-xs text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={preferences.summaryIncludeMonitors}
                                  onChange={(e) => setPreferences((p) => ({ ...p, summaryIncludeMonitors: e.target.checked }))}
                                  className="h-3.5 w-3.5 rounded border-slate-700 text-blue-600"
                                />
                                Incluir monitores
                              </label>
                              <label className="inline-flex items-center gap-1.5 text-xs text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={preferences.summaryIncludeCloud}
                                  onChange={(e) => setPreferences((p) => ({ ...p, summaryIncludeCloud: e.target.checked }))}
                                  className="h-3.5 w-3.5 rounded border-slate-700 text-blue-600"
                                />
                                Incluir proveedores cloud
                              </label>
                            </div>
                          </>
                        ) : (
                          <div className="space-y-2 text-sm text-slate-300">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">Frecuencia:</span>
                              <span>{freqLabels[preferences.summaryFrequency] ?? "Semanal"}</span>
                            </div>
                            {preferences.summaryFrequency >= SummaryFrequency.Daily && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">Dia:</span>
                                <span>{dayLabels[preferences.summaryDay] ?? "Lunes"}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">Incluye:</span>
                              <span className="text-xs text-slate-400">
                                {[
                                  preferences.summaryIncludeMonitors && "Monitores",
                                  preferences.summaryIncludeCloud && "Proveedores cloud",
                                ].filter(Boolean).join(", ") || "Ninguno"}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeTab === "template" && (
                <>
                  {/* Email template */}
                  <div className="rounded-xl border border-slate-700 bg-slate-900/60">
                    <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-3">
                      <svg className="h-4 w-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-200">Plantilla de correo</h3>
                        <p className="text-xs text-slate-400">Formato y contenido de los emails</p>
                      </div>
                    </div>
                    <div className="space-y-4 px-5 py-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400">Tipo de email</label>
                        {isEditing ? (
                          <div className="mt-1 flex gap-2">
                            {([
                              { value: EmailTemplateType.Compact, label: "Compacto" },
                              { value: EmailTemplateType.Detailed, label: "Detallado" },
                            ] as const).map((t) => (
                              <label
                                key={t.value}
                                className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                                  preferences.emailTemplate === t.value
                                    ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                                    : "border-slate-700 bg-slate-900/40 text-slate-400 hover:bg-slate-800/60"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="emailTemplate"
                                  value={t.value}
                                  checked={preferences.emailTemplate === t.value}
                                  onChange={() => setPreferences((p) => ({ ...p, emailTemplate: t.value }))}
                                  className="sr-only"
                                />
                                {t.label}
                              </label>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-300">
                            {preferences.emailTemplate === EmailTemplateType.Compact ? "Compacto" : "Detallado"}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                          { key: "includeTimeline" as const, label: "Incluir timeline" },
                          { key: "includeMetrics" as const, label: "Incluir metricas" },
                          { key: "includeDirectLinks" as const, label: "Links directos" },
                          { key: "includeCurrentStatus" as const, label: "Estado actual" },
                        ].map((opt) => (
                          <label key={opt.key} className="inline-flex items-center gap-1.5 text-xs text-slate-300">
                            {isEditing ? (
                              <input
                                type="checkbox"
                                checked={preferences[opt.key]}
                                onChange={(e) => setPreferences((p) => ({ ...p, [opt.key]: e.target.checked }))}
                                className="h-3.5 w-3.5 rounded border-slate-700 text-blue-600"
                              />
                            ) : (
                              <span className={`inline-block h-3.5 w-3.5 rounded-full ${preferences[opt.key] ? "bg-blue-500" : "bg-slate-700"}`} />
                            )}
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Language */}
                  <div className="rounded-xl border border-slate-700 bg-slate-900/60">
                    <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-3">
                      <svg className="h-4 w-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-200">Idioma</h3>
                        <p className="text-xs text-slate-400">Idioma de los correos de alerta</p>
                      </div>
                    </div>
                    <div className="px-5 py-3">
                      {isEditing ? (
                        <div className="flex gap-2">
                          {([
                            { value: NotificationLanguage.Spanish, label: "Espanol" },
                            { value: NotificationLanguage.English, label: "English" },
                          ] as const).map((lang) => (
                            <label
                              key={lang.value}
                              className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                                preferences.language === lang.value
                                  ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                                  : "border-slate-700 bg-slate-900/40 text-slate-400 hover:bg-slate-800/60"
                              }`}
                            >
                              <input
                                type="radio"
                                name="language"
                                value={lang.value}
                                checked={preferences.language === lang.value}
                                onChange={() => setPreferences((p) => ({ ...p, language: lang.value }))}
                                className="sr-only"
                              />
                              {lang.label}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-300">
                          {preferences.language === NotificationLanguage.Spanish ? "Espanol" : "English"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Branding */}
                  <div className="rounded-xl border border-slate-700 bg-slate-900/60">
                    <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-3">
                      <svg className="h-4 w-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-200">Branding del tenant</h3>
                        <p className="text-xs text-slate-400">Personalizacion de los correos (opcional)</p>
                      </div>
                    </div>
                    <div className="space-y-3 px-5 py-3">
                      {isEditing ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-400">Nombre tenant</label>
                            <input
                              type="text"
                              value={preferences.customTenantName ?? ""}
                              onChange={(e) => setPreferences((p) => ({ ...p, customTenantName: e.target.value || undefined }))}
                              placeholder="Cloud Alert Hub"
                              className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 placeholder-slate-600"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-400">Logo URL</label>
                            <input
                              type="text"
                              value={preferences.customTenantLogoUrl ?? ""}
                              onChange={(e) => setPreferences((p) => ({ ...p, customTenantLogoUrl: e.target.value || undefined }))}
                              placeholder="https://..."
                              className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 placeholder-slate-600"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-400">Color (hex)</label>
                            <input
                              type="text"
                              value={preferences.customTenantColor ?? ""}
                              onChange={(e) => setPreferences((p) => ({ ...p, customTenantColor: e.target.value || undefined }))}
                              placeholder="#2563eb"
                              className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 placeholder-slate-600"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 text-sm text-slate-300">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Nombre:</span>
                            <span>{preferences.customTenantName ?? "Por defecto"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Logo:</span>
                            <span>{preferences.customTenantLogoUrl ?? "Por defecto"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Color:</span>
                            <span>{preferences.customTenantColor ?? "Por defecto"}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Recipients — always visible */}
              <div className="rounded-xl border border-slate-700 bg-slate-900/60">
                <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-3">
                  <svg className="h-4 w-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Destinatarios adicionales</h3>
                    <p className="text-xs text-slate-400">Emails que tambien recibiran las alertas</p>
                  </div>
                </div>
                <div className="px-5 py-3">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddEmail(); } }}
                          placeholder="correo@empresa.com"
                          className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddEmail}
                          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
                        >
                          Agregar
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {preferences.additionalEmails.map((email) => (
                          <span key={email} className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
                            {email}
                            <button
                              type="button"
                              onClick={() => handleRemoveEmail(email)}
                              className="ml-1 text-slate-500 hover:text-red-400"
                            >
                              x
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-300">
                      {preferences.additionalEmails.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {preferences.additionalEmails.map((email) => (
                            <span key={email} className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
                              {email}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">Sin destinatarios adicionales</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              {isEditing && (
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                    {saving ? "Guardando..." : "Guardar preferencias"}
                  </button>
                </div>
              )}
            </div>

            {/* Right column — Test alerts + help */}
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-700 bg-slate-900/60">
                <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-3">
                  <svg className="h-4 w-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Probar alertas</h3>
                    <p className="text-xs text-slate-400">Verifica que tu configuracion funciona</p>
                  </div>
                </div>
                <div className="space-y-4 px-5 py-4">
                  {preferences.emailEnabled && enabledTestOptions.length > 0 ? (
                    <>
                      <label className="block text-xs font-medium text-slate-400">Tipo de alerta de prueba</label>
                      <select
                        value={testAlertType}
                        onChange={(e) => setTestAlertType(e.target.value as "auto" | "monitor" | "critical" | "major")}
                        disabled={testing}
                        className="block w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {enabledTestOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleTestAlert}
                        disabled={testing}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 hover:text-white disabled:opacity-50"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                        {testing ? "Enviando..." : "Enviar alerta de prueba"}
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-500">
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                      </div>
                      <p className="text-sm text-slate-400">
                        {preferences.emailEnabled
                          ? "No tienes tipos de alerta activados. Activa al menos uno para probar."
                          : "Activa las alertas por email primero para poder probar."}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick help card */}
              <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-5">
                <h4 className="text-sm font-semibold text-slate-200">Como funciona</h4>
                <ul className="mt-3 space-y-2 text-xs text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    El sistema revisa incidencias cada 5 minutos.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    Solo alerta si tienes activado ese tipo + proveedor.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    Misma alerta no se repite en el tiempo configurado.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    Respeta horarios silenciosos si los configuras.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
