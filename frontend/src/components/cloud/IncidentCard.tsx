import { CloudProviderAvatar } from "../CloudProviderAvatar";
import { CloudDisplayStatusBadge } from "../CloudDisplayStatusBadge";
import { CloudIncidentSeverityBadge } from "../CloudIncidentSeverityBadge";
import { CloudIncidentStatusBadge } from "../CloudIncidentStatusBadge";
import { formatDateTime, relativeTime } from "../../utils/cloudStatus";
import {
  type CloudIncidentDto,
  type CloudIncidentSeverity,
  type CloudIncidentStatus,
} from "../../types/cloudStatus";
import type { MicrosoftGraphIncident } from "../../services/microsoftIntegration";

type IncidentCardProps = {
  variant: "cloud" | "microsoft";
  incident: CloudIncidentDto | MicrosoftGraphIncident;
  isNew?: boolean;
  onSelect?: () => void;
  highlighted?: boolean;
};

export function IncidentCard({ variant, incident, isNew, onSelect, dense, highlighted }: IncidentCardProps & { dense?: boolean }) {
  const isCloud = variant === "cloud";
  const cloudIncident = isCloud ? (incident as CloudIncidentDto) : null;
  const providerName = cloudIncident?.providerName ?? "Microsoft 365";
  const providerLogoUrl =
    cloudIncident?.providerLogoUrl ??
    "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg";
  const displayStatus = cloudIncident?.displayStatus;
  const source = cloudIncident?.source ?? "Microsoft Graph";
  const severity = incident.severity as CloudIncidentSeverity;
  const status = incident.status as CloudIncidentStatus;

  const severityBorder =
    incident.severity === 3
      ? "border-l-red-500"
      : incident.severity === 2
        ? "border-l-orange-500"
        : incident.severity === 1
          ? "border-l-yellow-500"
          : "border-l-slate-600";

  return (
    <article
      id={`incident-${incident.id}`}
      className={`rounded-xl border bg-white dark:bg-slate-950 shadow-sm ${severityBorder} border-l-4 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/40 ${dense ? "p-2.5" : "p-4"} ${highlighted ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 animate-pulse" : "border-slate-200 dark:border-slate-800"}`}
      onClick={onSelect}
    >
      <div className="flex flex-wrap items-center gap-2">
        <CloudProviderAvatar name={providerName} logoUrl={providerLogoUrl} sizeClassName="h-8 w-8" />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{providerName}</div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
            <span className="font-mono text-slate-600 dark:text-slate-300">{new Date(incident.occurredAt).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" })}</span>
            <span>·</span>
            <span>{relativeTime(incident.occurredAt)}</span>
          </div>
        </div>
        {isCloud && displayStatus ? <CloudDisplayStatusBadge label={displayStatus} /> : null}
        <CloudIncidentSeverityBadge severity={severity} />
        <CloudIncidentStatusBadge status={status} />
        {isNew ? (
          <span className="rounded-full border border-violet-900/30 bg-violet-900/20 dark:border-violet-900/30 dark:bg-violet-900/20 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300 animate-pulse">
            Nuevo
          </span>
        ) : null}
      </div>

      <h3 className={`font-semibold text-slate-900 dark:text-slate-100 ${dense ? "mt-1.5 text-sm" : "mt-3 text-base"}`}>{incident.title}</h3>
      <div className={`flex items-center gap-1.5 font-mono text-emerald-600 dark:text-emerald-400 ${dense ? "mt-0.5 text-[10px]" : "mt-1 text-xs"}`}>
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        Detectado {formatDateTime(incident.occurredAt)}
      </div>
      <p className={`line-clamp-2 text-slate-600 dark:text-slate-400 ${dense ? "mt-1 text-xs leading-4" : "mt-1.5 text-sm leading-5"}`}>{incident.description}</p>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500 dark:text-slate-500">
        {incident.region ? (
          <span className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800/60 px-1.5 py-0.5 text-slate-700 dark:text-slate-300">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
            {incident.region}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800/60 px-1.5 py-0.5 text-slate-700 dark:text-slate-300">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
          {source}
        </span>
        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${incident.isActive ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300" : "bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300"}`}>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {incident.isActive ? "Activo" : "Inactivo"}
        </span>
        <span className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800/60 px-1.5 py-0.5 text-slate-700 dark:text-slate-300" title={formatDateTime(incident.occurredAt)}>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" /></svg>
          {relativeTime(incident.occurredAt)}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {incident.affectedServices.length > 0 ? (
          incident.affectedServices.map((service) => (
            <span key={service} className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-300">
              {service}
            </span>
          ))
        ) : (
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-500">
            Sin servicios afectados
          </span>
        )}
      </div>

      <div className={`flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800 text-xs ${dense ? "mt-2 pt-2" : "mt-3 pt-3"}`}>
        <div className="flex items-center gap-1.5">
          {incident.resolvedAt ? (
            <>
              <span className="inline-flex items-center gap-1 rounded bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-300 font-medium">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Resuelto
              </span>
              <span className="font-mono text-slate-600 dark:text-slate-300">{new Date(incident.resolvedAt).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" })}</span>
              <span className="text-slate-500 dark:text-slate-500">({relativeTime(incident.resolvedAt)})</span>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1 rounded bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 text-amber-700 dark:text-amber-300 font-medium animate-pulse">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                En seguimiento
              </span>
              <span className="font-mono text-slate-600 dark:text-slate-300">{new Date(incident.occurredAt).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" })}</span>
              <span className="text-slate-500 dark:text-slate-500">({relativeTime(incident.occurredAt)})</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">Ver detalles →</div>
      </div>
    </article>
  );
}
