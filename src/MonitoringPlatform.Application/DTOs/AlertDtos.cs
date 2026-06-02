using System;
using MonitoringPlatform.Domain.Entities;

namespace MonitoringPlatform.Application.DTOs
{
    public class CreateAlertRuleDto
    {
        public string Name { get; set; } = null!;
        public AlertType AlertType { get; set; }
        public AlertChannel Channel { get; set; }
        public int ThrottleMinutes { get; set; } = 15;
        public List<string> RecipientEmails { get; set; } = new();
        public List<Guid> SelectedCloudProviderIds { get; set; } = new();
    }

    public class UpdateAlertRuleDto
    {
        public string Name { get; set; } = null!;
        public AlertType AlertType { get; set; }
        public AlertChannel Channel { get; set; }
        public bool IsEnabled { get; set; }
        public int ThrottleMinutes { get; set; } = 15;
        public List<string> RecipientEmails { get; set; } = new();
        public List<Guid> SelectedCloudProviderIds { get; set; } = new();
    }

    public class AlertRuleResponseDto
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public string Name { get; set; } = null!;
        public AlertType AlertType { get; set; }
        public string AlertTypeLabel { get; set; } = null!;
        public AlertChannel Channel { get; set; }
        public string ChannelLabel { get; set; } = null!;
        public bool IsEnabled { get; set; }
        public int ThrottleMinutes { get; set; }
        public List<string> RecipientEmails { get; set; } = new();
        public List<Guid> SelectedCloudProviderIds { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class UserAlertPreferenceDto
    {
        public bool EmailEnabled { get; set; }

        // Alert types
        public bool MonitorDownAlerts { get; set; }
        public bool MonitorRecoveredAlerts { get; set; }
        public bool HighLatencyAlerts { get; set; }
        public bool CertificateExpiringAlerts { get; set; }
        public bool CertificateExpiredAlerts { get; set; }
        public bool CloudIncidentCriticalAlerts { get; set; }
        public bool CloudIncidentMajorAlerts { get; set; }
        public bool CloudIncidentMinorAlerts { get; set; }
        public bool ScheduledMaintenanceAlerts { get; set; }
        public bool IncidentResolvedAlerts { get; set; }
        public bool IntegrationErrorAlerts { get; set; }
        public bool CloudImportFailureAlerts { get; set; }
        public bool BackgroundJobFailureAlerts { get; set; }

        // Severity
        public NotificationSeverity MinimumSeverity { get; set; }

        // Cloud providers
        public List<Guid> SelectedCloudProviderIds { get; set; } = new();

        // Monitors
        public string MonitorSelectionMode { get; set; } = "All";
        public List<Guid> SelectedMonitorIds { get; set; } = new();
        public List<Guid> ExcludedMonitorIds { get; set; } = new();

        // Summary
        public bool SummaryEnabled { get; set; }
        public SummaryFrequency SummaryFrequency { get; set; }
        public DayOfWeek SummaryDay { get; set; }
        public bool SummaryIncludeMonitors { get; set; }
        public bool SummaryIncludeCloud { get; set; }

        // Quiet hours
        public bool QuietHoursEnabled { get; set; }
        public string QuietHoursStart { get; set; } = "22:00";
        public string QuietHoursEnd { get; set; } = "08:00";
        public string QuietHoursTimezone { get; set; } = "America/Lima";
        public bool QuietHoursExcludeWeekends { get; set; }

        // Anti-spam
        public int DeduplicationMinutes { get; set; } = 15;
        public bool GroupSimilarIncidents { get; set; } = true;
        public int CooldownMinutes { get; set; } = 5;

        // Recipients
        public List<string> AdditionalEmails { get; set; } = new();

        // Template
        public EmailTemplateType EmailTemplate { get; set; }
        public bool IncludeTimeline { get; set; } = true;
        public bool IncludeMetrics { get; set; } = true;
        public bool IncludeDirectLinks { get; set; } = true;
        public bool IncludeCurrentStatus { get; set; } = true;

        // Language
        public NotificationLanguage Language { get; set; }

        // Branding
        public string? CustomTenantName { get; set; }
        public string? CustomTenantLogoUrl { get; set; }
        public string? CustomTenantColor { get; set; }
    }

    public class TestAlertRequestDto
    {
        public string Type { get; set; } = "auto";
    }

    public class CloudProviderOptionDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = null!;
    }

    public class AlertHistoryResponseDto
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Guid? AlertRuleId { get; set; }
        public AlertType AlertType { get; set; }
        public string AlertTypeLabel { get; set; } = null!;
        public AlertChannel Channel { get; set; }
        public string Subject { get; set; } = null!;
        public string RecipientEmail { get; set; } = null!;
        public DateTime SentAt { get; set; }
        public bool IsSuccess { get; set; }
        public string? ErrorMessage { get; set; }
    }
}
