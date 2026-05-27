export const AlertType = {
  MonitorDown: 1,
  CloudIncidentCritical: 2,
  CloudIncidentMajor: 3,
} as const;

export type AlertType = (typeof AlertType)[keyof typeof AlertType];

export const AlertChannel = {
  Email: 1,
} as const;

export type AlertChannel = (typeof AlertChannel)[keyof typeof AlertChannel];

export interface AlertRule {
  id: string;
  tenantId: string;
  name: string;
  alertType: AlertType;
  alertTypeLabel: string;
  channel: AlertChannel;
  channelLabel: string;
  isEnabled: boolean;
  throttleMinutes: number;
  recipientEmails: string[];
  selectedCloudProviderIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AlertHistory {
  id: string;
  tenantId: string;
  alertRuleId?: string;
  alertType: AlertType;
  alertTypeLabel: string;
  channel: AlertChannel;
  subject: string;
  recipientEmail: string;
  sentAt: string;
  isSuccess: boolean;
  errorMessage?: string;
}

export interface CreateAlertRulePayload {
  name: string;
  alertType: AlertType;
  channel: AlertChannel;
  throttleMinutes: number;
  recipientEmails: string[];
  selectedCloudProviderIds: string[];
}

export interface UpdateAlertRulePayload {
  name: string;
  alertType: AlertType;
  channel: AlertChannel;
  isEnabled: boolean;
  throttleMinutes: number;
  recipientEmails: string[];
  selectedCloudProviderIds: string[];
}

export const SummaryFrequency = {
  Instant: 0,
  Every15Min: 1,
  Hourly: 2,
  Daily: 3,
  Weekly: 4,
} as const;

export type SummaryFrequency = (typeof SummaryFrequency)[keyof typeof SummaryFrequency];

export const NotificationSeverity = {
  Critical: 1,
  High: 2,
  Medium: 3,
  Low: 4,
} as const;

export type NotificationSeverity = (typeof NotificationSeverity)[keyof typeof NotificationSeverity];

export const EmailTemplateType = {
  Compact: 1,
  Detailed: 2,
} as const;

export type EmailTemplateType = (typeof EmailTemplateType)[keyof typeof EmailTemplateType];

export const NotificationLanguage = {
  Spanish: 1,
  English: 2,
} as const;

export type NotificationLanguage = (typeof NotificationLanguage)[keyof typeof NotificationLanguage];

export interface UserAlertPreference {
  emailEnabled: boolean;

  // Alert types
  monitorDownAlerts: boolean;
  monitorRecoveredAlerts: boolean;
  highLatencyAlerts: boolean;
  certificateExpiringAlerts: boolean;
  certificateExpiredAlerts: boolean;
  cloudIncidentCriticalAlerts: boolean;
  cloudIncidentMajorAlerts: boolean;
  cloudIncidentMinorAlerts: boolean;
  scheduledMaintenanceAlerts: boolean;
  incidentResolvedAlerts: boolean;
  integrationErrorAlerts: boolean;
  cloudImportFailureAlerts: boolean;
  backgroundJobFailureAlerts: boolean;

  // Severity
  minimumSeverity: NotificationSeverity;

  // Cloud providers
  selectedCloudProviderIds: string[];

  // Monitors
  monitorSelectionMode: "All" | "Selected" | "Excluded";
  selectedMonitorIds: string[];
  excludedMonitorIds: string[];

  // Summary
  summaryEnabled: boolean;
  summaryFrequency: SummaryFrequency;
  summaryDay: number;
  summaryIncludeMonitors: boolean;
  summaryIncludeCloud: boolean;

  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  quietHoursTimezone: string;
  quietHoursExcludeWeekends: boolean;

  // Anti-spam
  deduplicationMinutes: number;
  groupSimilarIncidents: boolean;
  cooldownMinutes: number;

  // Recipients
  additionalEmails: string[];

  // Template
  emailTemplate: EmailTemplateType;
  includeTimeline: boolean;
  includeMetrics: boolean;
  includeDirectLinks: boolean;
  includeCurrentStatus: boolean;

  // Language
  language: NotificationLanguage;

  // Branding
  customTenantName?: string;
  customTenantLogoUrl?: string;
  customTenantColor?: string;
}

export interface CloudProviderOption {
  id: string;
  name: string;
}

export function alertTypeLabel(type: AlertType): string {
  switch (type) {
    case AlertType.MonitorDown:
      return "Monitor caído";
    case AlertType.CloudIncidentCritical:
      return "Incidencia crítica";
    case AlertType.CloudIncidentMajor:
      return "Incidencia mayor";
    default:
      return "Desconocido";
  }
}

export function alertChannelLabel(channel: AlertChannel): string {
  switch (channel) {
    case AlertChannel.Email:
      return "Email";
    default:
      return "Desconocido";
  }
}
