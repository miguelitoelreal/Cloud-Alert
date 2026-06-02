import { useRef, useState } from "react";
import { Modal } from "../Modal";
import { CloudProviderAvatar } from "../CloudProviderAvatar";
import { CloudDisplayStatusBadge } from "../CloudDisplayStatusBadge";
import { CloudIncidentSeverityBadge } from "../CloudIncidentSeverityBadge";
import { CloudIncidentStatusBadge } from "../CloudIncidentStatusBadge";
import { MetaItem } from "./MetaItem";
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
      setTranslationError(
        e instanceof Error && e.message
          ? e.message
          : "No se pudo traducir el incidente en este momento. Intenta nuevamente más tarde.",
      );
    } finally {
      setIsTranslating(false);
    }
  }

  const displayedTitle = translation && showTranslated ? translation.translatedTitle : incident.title;
  const displayedDescription =
    translation && showTranslated
      ? translation.translatedDescription || "Sin contenido traducido adicional."
      : incident.description;

  return (
    <Modal open={isOpen} title="Detalle del incidente" onClose={onClose} size="lg">
      <div ref={contentRef} className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <CloudProviderAvatar name={providerName} logoUrl={providerLogoUrl} sizeClassName="h-8 w-8" />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-100">{providerName}</div>
            <div className="text-xs text-slate-400">{relativeTime(incident.occurredAt)}</div>
          </div>
          {isCloud && displayStatus ? <CloudDisplayStatusBadge label={displayStatus} /> : null}
          <CloudIncidentSeverityBadge severity={severity} />
          <CloudIncidentStatusBadge status={status} />
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Detalle original
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-100">{incident.title}</div>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-300">
            {incident.description}
          </p>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Metadatos del incidente
          </div>
          <dl className="mt-2 space-y-2 text-sm">
            {isCloud ? (
              <>
                <MetaItem label="Proveedor" value={providerName} />
                <MetaItem label="Estado visual" value={displayStatus ?? "—"} />
              </>
            ) : (
              <>
                <MetaItem label="ID externo" value={incident.id} />
                <MetaItem label="Estado" value={cloudIncidentStatusLabel(status)} />
                <MetaItem label="Severidad" value={cloudIncidentSeverityLabel(severity)} />
              </>
            )}
            <MetaItem label="Última actualización" value={formatDateTime(incident.lastUpdatedAt)} />
            <MetaItem label="Detectado" value={formatDateTime(incident.occurredAt)} />
            <MetaItem
              label="Resolución"
              value={incident.resolvedAt ? formatDateTime(incident.resolvedAt) : "Aún activo"}
            />
            <MetaItem
              label="Días con incidente"
              value={calculateIncidentDays(incident.occurredAt, incident.resolvedAt)}
            />
          </dl>
        </div>

        {isCloud && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {showTranslated && translation ? "Traducción al español" : "Vista original"}
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
                <div className="mt-2 text-sm font-semibold text-slate-100">{displayedTitle}</div>
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
                <button
                  type="button"
                  onClick={handleTranslate}
                  className="font-medium text-slate-300 hover:text-slate-100"
                >
                  Traducir al español
                </button>{" "}
                para ver este incidente traducido.
              </div>
            )}
            {translationError ? (
              <div className="mt-3 rounded-md border border-red-900/30 bg-red-900/20 px-3 py-2 text-xs text-red-300">
                {translationError}
              </div>
            ) : null}
          </div>
        )}

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
              <span className="text-sm text-slate-500">Sin servicios afectados especificados.</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <a
            href={incident.officialUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
          >
            Ver fuente oficial →
          </a>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            {copied ? "Enlace copiado ✓" : "Compartir"}
          </button>
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            Descargar PDF
          </button>
          {isCloud && (
            <button
              type="button"
              onClick={handleTranslate}
              disabled={isTranslating}
              className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              {isTranslating ? "Traduciendo..." : translation ? (showTranslated ? "Ver original" : "Ver traducción") : "Traducir al español"}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
