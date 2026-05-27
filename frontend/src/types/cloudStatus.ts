export const CloudStatusSourceType = {
  Rss: 1,
  Atom: 2,
  StatuspageApi: 3,
  JsonApi: 4,
  MicrosoftGraphServiceHealth: 5,
} as const;

export type CloudStatusSourceType =
  (typeof CloudStatusSourceType)[keyof typeof CloudStatusSourceType];

export const CloudIncidentSeverity = {
  Unknown: 0,
  Informational: 1,
  Minor: 2,
  Major: 3,
  Critical: 4,
} as const;

export type CloudIncidentSeverity =
  (typeof CloudIncidentSeverity)[keyof typeof CloudIncidentSeverity];

export const CloudIncidentStatus = {
  Unknown: 0,
  Investigating: 1,
  Identified: 2,
  Monitoring: 3,
  Resolved: 4,
  Maintenance: 5,
  Scheduled: 6,
} as const;

export type CloudIncidentStatus =
  (typeof CloudIncidentStatus)[keyof typeof CloudIncidentStatus];

export type CloudStatusSummaryDto = {
  totalProviders: number;
  activeIncidents: number;
  criticalOutages: number;
  operationalServices: number;
  lastUpdatedAt: string | null;
};

export type CloudProviderDto = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  sourceType: CloudStatusSourceType;
  statusPageUrl: string | null;
  isEnabled: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  activeIncidents: number;
};

export type CloudIncidentDto = {
  id: string;
  providerId: string;
  providerName: string;
  providerSlug: string;
  providerLogoUrl: string;
  title: string;
  description: string;
  severity: CloudIncidentSeverity;
  status: CloudIncidentStatus;
  region: string | null;
  affectedServices: string[];
  source: string;
  officialUrl: string;
  isActive: boolean;
  occurredAt: string;
  lastUpdatedAt: string;
  resolvedAt: string | null;
  displayStatus: string;
};

export type CloudStatusOverviewDto = {
  summary: CloudStatusSummaryDto;
  providers: CloudProviderDto[];
  incidents: CloudIncidentDto[];
};

export type CloudIncidentTranslationRequestDto = {
  incidentId?: string;
  title: string;
  description: string;
};

export type CloudIncidentTranslationDto = {
  translatedTitle: string;
  translatedDescription: string;
};

export function cloudStatusSourceTypeLabel(
  value: CloudStatusSourceType,
): string {
  switch (value) {
    case CloudStatusSourceType.Rss:
      return "RSS";
    case CloudStatusSourceType.Atom:
      return "Atom";
    case CloudStatusSourceType.StatuspageApi:
      return "Statuspage API";
    case CloudStatusSourceType.JsonApi:
      return "JSON API";
    case CloudStatusSourceType.MicrosoftGraphServiceHealth:
      return "Microsoft Graph";
    default:
      return "Fuente";
  }
}

export function cloudIncidentSeverityLabel(
  value: CloudIncidentSeverity,
): string {
  switch (value) {
    case CloudIncidentSeverity.Informational:
      return "Informativa";
    case CloudIncidentSeverity.Minor:
      return "Menor";
    case CloudIncidentSeverity.Major:
      return "Mayor";
    case CloudIncidentSeverity.Critical:
      return "Crítica";
    case CloudIncidentSeverity.Unknown:
    default:
      return "Sin clasificar";
  }
}

export function cloudIncidentStatusLabel(value: CloudIncidentStatus): string {
  switch (value) {
    case CloudIncidentStatus.Investigating:
      return "Investigando";
    case CloudIncidentStatus.Identified:
      return "Identificado";
    case CloudIncidentStatus.Monitoring:
      return "Monitoreando";
    case CloudIncidentStatus.Resolved:
      return "Resuelto";
    case CloudIncidentStatus.Maintenance:
      return "Mantenimiento";
    case CloudIncidentStatus.Scheduled:
      return "Programado";
    case CloudIncidentStatus.Unknown:
    default:
      return "Desconocido";
  }
}
