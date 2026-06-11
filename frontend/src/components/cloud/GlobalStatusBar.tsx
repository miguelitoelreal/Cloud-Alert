import type { CloudStatusOverviewDto } from "../../types/cloudStatus";

export function GlobalStatusBar({
  summary,
  isLoading,
}: {
  summary?: CloudStatusOverviewDto["summary"];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-500 animate-pulse">
        Cargando estado del ecosistema...
      </div>
    );
  }
  const active = summary?.activeIncidents ?? 0;
  const critical = summary?.criticalOutages ?? 0;
  const total = summary?.totalProviders ?? 0;
  const operational = summary?.operationalServices ?? 0;

  if (active === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-900/30 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-300">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="font-medium">Todos los servicios operativos</span>
        <span className="text-emerald-400/70">· {operational}/{total} proveedores saludables</span>
      </div>
    );
  }
  if (critical > 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-900/30 bg-red-950/20 px-3 py-2 text-xs text-red-300">
        <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
        <span className="font-medium">{critical} outage{critical > 1 ? "s" : ""} crítico{critical > 1 ? "s" : ""} activo{critical > 1 ? "s" : ""}</span>
        <span className="text-red-400/70">· {active} incidente{active > 1 ? "s" : ""} en total</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-900/30 bg-amber-950/20 px-3 py-2 text-xs text-amber-300">
      <span className="h-2 w-2 rounded-full bg-amber-400" />
      <span className="font-medium">{active} incidente{active > 1 ? "s" : ""} activo{active > 1 ? "s" : ""}</span>
      <span className="text-amber-400/70">· {operational}/{total} proveedores operativos</span>
    </div>
  );
}
