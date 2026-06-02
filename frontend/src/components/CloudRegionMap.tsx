import { useMemo, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { getRegionCoords } from "../data/cloudRegions";
import type { CloudIncidentStatus } from "../types/cloudStatus";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export interface MapIncident {
  id: string;
  title: string;
  description: string;
  severity: number;
  status: CloudIncidentStatus;
  region?: string | null;
  isActive: boolean;
  occurredAt: string;
  lastUpdatedAt: string;
  providerName: string;
  providerLogoUrl?: string | null;
}

export interface RegionStats {
  name: string;
  lat: number;
  lon: number;
  totalIncidents: number;
  activeIncidents: number;
  highestSeverity: number;
  providers: Set<string>;
  incidents: MapIncident[];
}

export interface CloudRegionMapProps {
  incidents: MapIncident[];
  onRegionClick?: (stats: RegionStats) => void;
}

function computeRegionStats(incidents: MapIncident[]): RegionStats[] {
  const map = new Map<string, RegionStats>();

  for (const incident of incidents) {
    const coords = getRegionCoords(incident.region);
    if (!coords) continue;

    const key = `${coords.lat},${coords.lon}`;
    let entry = map.get(key);
    if (!entry) {
      entry = {
        name: incident.region ?? "Desconocida",
        lat: coords.lat,
        lon: coords.lon,
        totalIncidents: 0,
        activeIncidents: 0,
        highestSeverity: 0,
        providers: new Set<string>(),
        incidents: [],
      };
      map.set(key, entry);
    }

    entry.totalIncidents++;
    if (incident.isActive) entry.activeIncidents++;
    if (incident.severity > entry.highestSeverity) entry.highestSeverity = incident.severity;
    entry.providers.add(incident.providerName);
    entry.incidents.push(incident);
  }

  return Array.from(map.values()).sort(
    (a, b) => b.totalIncidents - a.totalIncidents,
  );
}

function severityColor(severity: number): string {
  // Critical = red, Major = orange, Minor = amber, Informational = blue
  switch (severity) {
    case 2: return "#dc2626"; // Critical
    case 1: return "#ea580c"; // Major
    case 0: return "#d97706"; // Minor
    default: return "#2563eb"; // Informational / other
  }
}

function severityLabel(severity: number): string {
  switch (severity) {
    case 2: return "Crítica";
    case 1: return "Mayor";
    case 0: return "Menor";
    default: return "Informativa";
  }
}

function pulseClass(severity: number): string {
  if (severity >= 2) return "animate-ping";
  if (severity >= 1) return "animate-pulse";
  return "";
}

export function CloudRegionMap({ incidents, onRegionClick }: CloudRegionMapProps) {
  const regions = useMemo(() => computeRegionStats(incidents), [incidents]);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    region: RegionStats;
  } | null>(null);

  const maxCount = useMemo(() => {
    return regions.reduce((m, r) => Math.max(m, r.totalIncidents), 1);
  }, [regions]);

  function radiusFor(count: number): number {
    // Scale from 4px to 18px based on count
    const ratio = count / maxCount;
    return 4 + ratio * 14;
  }

  const hasRegions = regions.length > 0;

  return (
    <div className="relative">
      {!hasRegions && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/90 p-6 text-center shadow-lg">
            <div className="text-sm font-medium text-slate-300">
              No hay incidencias con ubicación conocida
            </div>
            <div className="mt-1 max-w-xs text-xs text-slate-400">
              Los filtros actuales no arrojan incidencias asociadas a una región geográfica en el mapa.
            </div>
          </div>
        </div>
      )}
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 140, center: [10, 25] }}
        style={{ width: "100%", height: "500px", background: "#0f172a" }}
      >
        <ZoomableGroup zoom={1} minZoom={1} maxZoom={8} center={[10, 25]}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#1e293b"
                  stroke="#334155"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { fill: "#334155", outline: "none" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>

          {regions.map((region) => {
            const r = radiusFor(region.totalIncidents);
            const color = severityColor(region.highestSeverity);
            const pulse = pulseClass(region.highestSeverity);

            return (
              <Marker
                key={`${region.lat}-${region.lon}`}
                coordinates={[region.lon, region.lat]}
              >
                {/* Pulse ring for active critical/major incidents */}
                {region.activeIncidents > 0 && region.highestSeverity >= 1 && (
                  <circle
                    cx={0}
                    cy={0}
                    r={r + 6}
                    fill={color}
                    opacity={0.25}
                    className={pulse}
                  />
                )}
                {/* Main dot */}
                <circle
                  cx={0}
                  cy={0}
                  r={r}
                  fill={color}
                  stroke="#0f172a"
                  strokeWidth={2}
                  className="cursor-pointer transition-all duration-300 hover:stroke-4"
                  onMouseEnter={(e) => {
                    setTooltip({
                      x: e.clientX,
                      y: e.clientY,
                      region,
                    });
                  }}
                  onMouseMove={(e) => {
                    setTooltip({
                      x: e.clientX,
                      y: e.clientY,
                      region,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => onRegionClick?.(region)}
                />
                {/* Label */}
                {r > 10 && (
                  <text
                    x={0}
                    y={-r - 6}
                    textAnchor="middle"
                    className="pointer-events-none select-none text-[10px] font-semibold"
                    fill="#f8fafc"
                  >
                    {region.name.length > 14
                      ? region.name.slice(0, 12) + "…"
                      : region.name}
                  </text>
                )}
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 max-w-xs rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-lg"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 12,
          }}
        >
          <div className="mb-1 text-sm font-semibold text-slate-100">
            {tooltip.region.name}
          </div>
          <div className="space-y-1 text-xs text-slate-300">
            <div>
              <span className="font-medium">{tooltip.region.totalIncidents}</span>{" "}
              incidencia{tooltip.region.totalIncidents !== 1 ? "s" : ""}
            </div>
            {tooltip.region.activeIncidents > 0 && (
              <div className="text-amber-400">
                <span className="font-medium">{tooltip.region.activeIncidents}</span> activa
                {tooltip.region.activeIncidents !== 1 ? "s" : ""}
              </div>
            )}
            <div>
              Severidad máxima:{" "}
              <span
                className="font-semibold"
                style={{ color: severityColor(tooltip.region.highestSeverity) }}
              >
                {severityLabel(tooltip.region.highestSeverity)}
              </span>
            </div>
            <div className="text-slate-400">
              Proveedores: {Array.from(tooltip.region.providers).join(", ")}
            </div>
          </div>
          <div className="mt-1 text-[10px] text-slate-500">Clic para ver detalle</div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 rounded-lg border border-slate-700 bg-slate-900/90 p-2 text-[10px] backdrop-blur-sm">
        <div className="mb-1 font-semibold text-slate-300">Severidad</div>
        <div className="space-y-1">
          {[
            { label: "Crítica", color: "#dc2626" },
            { label: "Mayor", color: "#ea580c" },
            { label: "Menor", color: "#d97706" },
            { label: "Informativa", color: "#2563eb" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-slate-300">{item.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 border-t border-slate-700 pt-1 font-semibold text-slate-300">
          Tamaño = cantidad
        </div>
      </div>
    </div>
  );
}
