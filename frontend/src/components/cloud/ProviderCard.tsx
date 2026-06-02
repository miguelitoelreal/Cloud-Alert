import { useNavigate } from "react-router-dom";
import { CloudProviderAvatar } from "../CloudProviderAvatar";
import { MiniSparkline } from "./MiniSparkline";
import {
  CloudStatusSourceType,
  cloudStatusSourceTypeLabel,
  type CloudProviderDto,
} from "../../types/cloudStatus";
import { relativeFreshness } from "../../utils/cloudStatus";

type ProviderCardProps = {
  provider: CloudProviderDto;
  msIntegrationConfigured: boolean | null;
  trendPoints?: number[];
};

export function ProviderCard({
  provider,
  msIntegrationConfigured,
  trendPoints,
}: ProviderCardProps) {
  const navigate = useNavigate();
  const isMsProvider =
    provider.sourceType === CloudStatusSourceType.MicrosoftGraphServiceHealth;
  const needsConfig = isMsProvider && msIntegrationConfigured === false;

  const statusConfig = needsConfig
    ? { label: "Requiere integración", dot: "bg-orange-500", bg: "bg-orange-50 dark:bg-orange-950/20", text: "text-orange-700 dark:text-orange-300", border: "border-orange-200 dark:border-orange-900/30" }
    : provider.activeIncidents > 1
      ? { label: `${provider.activeIncidents} incidentes`, dot: "bg-red-500", bg: "bg-red-50 dark:bg-red-950/20", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-900/30" }
      : provider.activeIncidents === 1
        ? { label: "1 incidente", dot: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-900/30" }
        : { label: "Operativo", dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/20", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-900/30" };

  const handleClick = () => {
    if (needsConfig) {
      navigate("/integraciones");
    } else {
      navigate(`/cloud-status/${provider.slug}`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900 text-left"
    >
      {/* Status bar at top */}
      <div className={`h-1 w-full ${statusConfig.dot}`} />

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {/* Header: avatar + name + source badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <CloudProviderAvatar
                name={provider.name}
                logoUrl={provider.logoUrl}
                sizeClassName="h-10 w-10"
              />
              <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${statusConfig.dot}`} />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {provider.name}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {needsConfig ? "Integración pendiente" : relativeFreshness(provider.lastSyncedAt)}
              </p>
            </div>
          </div>
          <span className="shrink-0 truncate max-w-[100px] rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {cloudStatusSourceTypeLabel(provider.sourceType)}
          </span>
        </div>

        {/* Status badge */}
        <div className="mt-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
            {statusConfig.label}
          </span>
        </div>

        {/* Sparkline */}
        {trendPoints && trendPoints.length > 0 && (
          <div className="mt-3 flex-1">
            <div className="flex items-end justify-between gap-2">
              <span className="text-[10px] text-slate-400 dark:text-slate-500">14 días</span>
              <MiniSparkline
                data={trendPoints}
                color={provider.activeIncidents > 0 ? "#f87171" : "#34d399"}
              />
            </div>
          </div>
        )}

        {/* Footer link */}
        <div className="mt-3 flex items-center gap-1 text-xs font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-blue-400">
          <span>{needsConfig ? "Configurar" : "Ver detalle del proveedor"}</span>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </div>
      </div>
    </button>
  );
}
