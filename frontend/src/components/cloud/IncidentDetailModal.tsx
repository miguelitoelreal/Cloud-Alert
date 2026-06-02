import { useRef, useState } from "react";
import axios from "axios";
import { Modal } from "../Modal";
import { CloudProviderAvatar } from "../CloudProviderAvatar";
import { CloudDisplayStatusBadge } from "../CloudDisplayStatusBadge";
import { CloudIncidentSeverityBadge } from "../CloudIncidentSeverityBadge";
import { CloudIncidentStatusBadge } from "../CloudIncidentStatusBadge";
import { MetaCard } from "./MetaCard";
import { formatDateTime, relativeTime } from "../../utils/cloudStatus";
import { translateCloudIncident } from "../../services/cloudStatus";
import {
  CloudIncidentSeverity,
  cloudIncidentSeverityLabel,
  cloudIncidentStatusLabel,
  type CloudIncidentDto,
  type CloudIncidentStatus,
  type CloudIncidentTranslationDto,
} from "../../types/cloudStatus";
import type { MicrosoftGraphIncident } from "../../services/microsoftIntegration";
import { jsPDF } from "jspdf";

export type IncidentDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  variant: "cloud" | "microsoft";
  incident: CloudIncidentDto | MicrosoftGraphIncident;
  cachedTranslation?: CloudIncidentTranslationDto | null;
  onTranslationLoaded?: (incidentId: string, translation: CloudIncidentTranslationDto) => void;
};

function calculateIncidentDays(occurredAt: string, resolvedAt: string | null | undefined): string {
  const start = new Date(occurredAt);
  const end = resolvedAt ? new Date(resolvedAt) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours <= 0) return "Menos de 1 hora";
    return `${diffHours} hora${diffHours > 1 ? "s" : ""}`;
  }
  return `${diffDays} día${diffDays > 1 ? "s" : ""}`;
}

export function IncidentDetailModal({
  isOpen,
  onClose,
  variant,
  incident,
  cachedTranslation,
  onTranslationLoaded,
}: IncidentDetailModalProps) {
  const isCloud = variant === "cloud";
  const cloudIncident = isCloud ? (incident as CloudIncidentDto) : null;
  const providerName = cloudIncident?.providerName ?? "Microsoft 365";
  const providerLogoUrl =
    cloudIncident?.providerLogoUrl ??
    "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg";
  const displayStatus = cloudIncident?.displayStatus;
  const severity = incident.severity as CloudIncidentSeverity;
  const status = incident.status as CloudIncidentStatus;

  const [localTranslation, setLocalTranslation] = useState<CloudIncidentTranslationDto | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslated, setShowTranslated] = useState(Boolean(isCloud && cachedTranslation));
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const translation = localTranslation ?? (isCloud ? cachedTranslation ?? null : null);

  function handleDownloadPDF() {
    try {
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      let y = margin;
      const maxWidth = pageWidth - margin * 2;

      pdf.setFontSize(16);
      pdf.setTextColor(37, 99, 235);
      pdf.text("Reporte de Incidente", pageWidth / 2, y, { align: "center" });
      y += 10;

      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generado: ${new Date().toLocaleString("es-PE")}`, pageWidth / 2, y, { align: "center" });
      y += 12;

      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text("Proveedor:", margin, y);
      pdf.setFontSize(11);
      pdf.text(providerName, margin + 35, y);
      y += 8;

      pdf.setFontSize(12);
      pdf.text("Título:", margin, y);
      pdf.setFontSize(11);
      const titleLines = pdf.splitTextToSize(incident.title, maxWidth - 40);
      pdf.text(titleLines, margin + 35, y);
      y += titleLines.length * 5 + 3;

      pdf.setFontSize(12);
      pdf.text("Descripción:", margin, y);
      y += 6;
      pdf.setFontSize(10);
      const descLines = pdf.splitTextToSize(incident.description || "Sin descripción.", maxWidth);
      pdf.text(descLines, margin, y);
      y += descLines.length * 5 + 6;

      const items = [
        ["Estado", cloudIncidentStatusLabel(status)],
        ["Severidad", cloudIncidentSeverityLabel(severity)],
        ["Detectado", formatDateTime(incident.occurredAt)],
        ["Última actualización", formatDateTime(incident.lastUpdatedAt)],
        ["Resolución", incident.resolvedAt ? formatDateTime(incident.resolvedAt) : "Aún activo"],
        ["Días con incidente", calculateIncidentDays(incident.occurredAt, incident.resolvedAt)],
        ["Servicios afectados", incident.affectedServices.length > 0 ? incident.affectedServices.join(", ") : "Ninguno"],
        ["Fuente oficial", incident.officialUrl],
      ];

      items.forEach(([label, value]) => {
        if (y > 280) {
          pdf.addPage();
          y = margin;
        }
        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        pdf.text(`${label}:`, margin, y);
        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);
        const valueLines = pdf.splitTextToSize(String(value), maxWidth - 50);
        pdf.text(valueLines, margin + 50, y);
        y += Math.max(valueLines.length * 5, 6) + 2;
      });

      pdf.save(`incidente_${incident.id.slice(0, 8)}.pdf`);
    } catch (e) {
      console.error("Error generando PDF:", e);
      alert("No se pudo generar el PDF. Revisa la consola (F12) para más detalles.");
    }
  }

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(incident.officialUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  async function handleTranslate() {
    if (!isCloud) return;
    if (translation) {
      setShowTranslated((current) => !current);
      return;
    }
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
      if (onTranslationLoaded) onTranslationLoaded(incident.id, result);
    } catch (e) {
      let msg = "No se pudo traducir el incidente en este momento. Intenta nuevamente más tarde.";
      if (axios.isAxiosError(e)) {
        const status = e.response?.status;
        if (status === 404) msg = "El servicio de traducción no está disponible (404). Contacta al administrador.";
        else if (status === 500) msg = "Error interno del servidor de traducción (500). Intenta más tarde.";
        else if (status === 429) msg = "Demasiadas solicitudes de traducción. Espera un momento e intenta de nuevo.";
        else if (!status) msg = "No se pudo conectar con el servicio de traducción. Verifica tu conexión a internet.";
        else msg = `Error del servicio de traducción (${status}). Intenta nuevamente.`;
      } else if (e instanceof Error && e.message) {
        msg = e.message;
      }
      setTranslationError(msg);
      // eslint-disable-next-line no-console
      console.error("[Translate] Error:", e);
    } finally {
      setIsTranslating(false);
    }
  }

  const displayedTitle = translation && showTranslated ? translation.translatedTitle : incident.title;
  const displayedDescription =
    translation && showTranslated
      ? translation.translatedDescription || "Sin contenido traducido adicional."
      : incident.description;

  const sevColors: Record<CloudIncidentSeverity, string> = {
    0: "border-l-slate-500",
    1: "border-l-blue-500",
    2: "border-l-yellow-500",
    3: "border-l-orange-500",
    4: "border-l-red-500",
  };

  return (
    <Modal open={isOpen} title="Detalle del incidente" onClose={onClose} size="lg">
      <div ref={contentRef} className="space-y-6">
        {/* ===== HEADER CARD ===== */}
        <div className={`relative overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-800/90 to-slate-900 p-5 shadow-lg ${sevColors[severity] ?? "border-l-slate-500"} border-l-[5px]`}>
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-slate-700/20 blur-2xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <CloudProviderAvatar name={providerName} logoUrl={providerLogoUrl} sizeClassName="h-12 w-12" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-base font-bold text-white">{providerName}</span>
                  <span className="text-xs text-slate-400">{relativeTime(incident.occurredAt)}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {isCloud && displayStatus ? <CloudDisplayStatusBadge label={displayStatus} /> : null}
                  <CloudIncidentSeverityBadge severity={severity} />
                  <CloudIncidentStatusBadge status={status} />
                </div>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {calculateIncidentDays(incident.occurredAt, incident.resolvedAt)}
              </div>
            </div>
          </div>
        </div>

        {/* ===== CONTENT TABS ===== */}
        {isCloud && (
          <div className="flex items-center gap-1 rounded-xl border border-slate-700/50 bg-slate-900/60 p-1">
            <button
              type="button"
              onClick={() => setShowTranslated(false)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${!showTranslated ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
            >
              Original
            </button>
            <button
              type="button"
              onClick={() => {
                if (!translation) handleTranslate();
                else setShowTranslated(true);
              }}
              disabled={isTranslating}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${showTranslated ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"} disabled:opacity-50`}
            >
              {isTranslating ? "Traduciendo..." : translation ? "Traducido" : "Traducir"}
            </button>
          </div>
        )}

        {/* ===== TITLE + DESCRIPTION ===== */}
        <div>
          <h3 className="text-lg font-extrabold leading-snug tracking-tight text-white">{displayedTitle}</h3>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-300">{displayedDescription}</p>
          {isCloud && isTranslating && (
            <div className="mt-3 rounded-xl border border-blue-900/30 bg-blue-900/20 px-4 py-3 text-xs font-semibold text-blue-300 animate-pulse">
              Traduciendo incidente...
            </div>
          )}
          {isCloud && translationError && (
            <div className="mt-3 rounded-xl border border-red-900/30 bg-red-900/20 px-4 py-3 text-xs font-semibold text-red-300">
              {translationError}
            </div>
          )}
        </div>

        {/* ===== METADATA GRID ===== */}
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.25 2.25m5.303 12.575v-.5a.75.75 0 00-.75-.75H3a.75.75 0 00-.75.75v.5c0 .97.78 1.768 1.755 1.866a5.023 5.023 0 001.758-.19m14.99 0a5.023 5.023 0 001.758.19c.975-.098 1.755-.896 1.755-1.866z" /></svg>
            Metadatos
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {isCloud ? (
              <>
                <MetaCard label="Proveedor" value={providerName} />
                <MetaCard label="Estado visual" value={displayStatus ?? "—"} />
              </>
            ) : (
              <>
                <MetaCard label="ID externo" value={incident.id} />
                <MetaCard label="Estado" value={cloudIncidentStatusLabel(status)} />
              </>
            )}
            <MetaCard label="Detectado" value={formatDateTime(incident.occurredAt)} />
            <MetaCard label="Ultima actualizacion" value={formatDateTime(incident.lastUpdatedAt)} />
            <MetaCard label="Resolucion" value={incident.resolvedAt ? formatDateTime(incident.resolvedAt) : "Aun activo"} color={incident.resolvedAt ? undefined : "text-rose-400"} />
            <MetaCard label="Duracion" value={calculateIncidentDays(incident.occurredAt, incident.resolvedAt)} />
          </div>
        </div>

        {/* ===== SERVICES ===== */}
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95 1.18l-.516.808a.75.75 0 01-1.262 0l-.515-.808a3.735 3.735 0 00-2.949-1.18 4.5 4.5 0 01-4.884-4.484A4.5 4.5 0 016.75 2.25 4.5 4.5 0 0111.25 6.75c0 1.398-.626 2.65-1.613 3.487a4.474 4.474 0 00-2.364-.66 4.5 4.5 0 00-4.884 4.484c0 1.398.626 2.65 1.613 3.487.938.836 2.19 1.273 3.487 1.273.807 0 1.584-.186 2.283-.525a.75.75 0 01.745.043c.78.525 1.696.807 2.64.807.943 0 1.86-.282 2.64-.807a.75.75 0 01.745-.043c.7.339 1.477.525 2.283.525 1.298 0 2.55-.437 3.487-1.273.987-.837 1.613-2.089 1.613-3.487A4.5 4.5 0 0015.75 9.75a4.474 4.474 0 00-2.364.66c-.987-.837-1.613-2.089-1.613-3.487A4.5 4.5 0 0115.75 2.25z" /></svg>
            Servicios afectados
          </div>
          {incident.affectedServices.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {incident.affectedServices.map((service) => (
                <span key={service} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800">
                  {service}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-sm text-slate-500">Sin servicios afectados especificados.</span>
          )}
        </div>

        {/* ===== ACTIONS ===== */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <a href={incident.officialUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:-translate-y-px hover:bg-blue-500 hover:shadow">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 013 3.75v-1.5m0 9c0 .966.392 1.841 1.028 2.475l.675.675M9 12.75l-2.25 2.25M9 12.75l2.25-2.25M9 12.75V9.75m3 3v3m0 0l2.25 2.25m-2.25-2.25l2.25-2.25M15 12.75V9.75m0 0c0-.966-.392-1.841-1.028-2.475l-.675-.675M15 12.75l-2.25 2.25m2.25-2.25l-2.25-2.25" /></svg>
            Ver fuente oficial
          </a>
          <button type="button" onClick={handleShare} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-300 shadow-sm transition-all hover:-translate-y-px hover:bg-slate-800 hover:shadow">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
            {copied ? "Copiado!" : "Copiar enlace"}
          </button>
          <button type="button" onClick={handleDownloadPDF} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-300 shadow-sm transition-all hover:-translate-y-px hover:bg-slate-800 hover:shadow">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            Descargar PDF
          </button>
        </div>
      </div>
    </Modal>
  );
}
