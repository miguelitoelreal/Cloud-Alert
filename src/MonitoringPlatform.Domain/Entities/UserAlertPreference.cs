using System;
using System.Collections.Generic;

namespace MonitoringPlatform.Domain.Entities
{
    public enum SummaryFrequency
    {
        Instant = 0,
        Every15Min = 1,
        Hourly = 2,
        Daily = 3,
        Weekly = 4,
    }

    public enum NotificationSeverity
    {
        Critical = 1,
        High = 2,
        Medium = 3,
        Low = 4,
    }

    public enum EmailTemplateType
    {
        Compact = 1,
        Detailed = 2,
    }

    public enum NotificationLanguage
    {
        Spanish = 1,
        English = 2,
    }

    public class UserAlertPreference
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public Guid TenantId { get; set; }

        public bool EmailEnabled { get; set; } = true;

        // Alert types
        public bool MonitorDownAlerts { get; set; } = true;
        public bool MonitorRecoveredAlerts { get; set; } = true;
        public bool HighLatencyAlerts { get; set; } = false;
        public bool CertificateExpiringAlerts { get; set; } = false;
        public bool CertificateExpiredAlerts { get; set; } = false;
        public bool CloudIncidentCriticalAlerts { get; set; } = true;
        public bool CloudIncidentMajorAlerts { get; set; } = true;
        public bool CloudIncidentMinorAlerts { get; set; } = false;
        public bool ScheduledMaintenanceAlerts { get; set; } = false;
        public bool IncidentResolvedAlerts { get; set; } = false;
        public bool IntegrationErrorAlerts { get; set; } = false;
        public bool CloudImportFailureAlerts { get; set; } = false;
        public bool BackgroundJobFailureAlerts { get; set; } = false;

        // Minimum severity
        public NotificationSeverity MinimumSeverity { get; set; } = NotificationSeverity.Medium;

        // Cloud provider selection (comma-separated Guids)
        public string SelectedCloudProviderIds { get; set; } = string.Empty;

        // Monitor selection mode: All, Selected, Excluded
        public string MonitorSelectionMode { get; set; } = "All";
        public string SelectedMonitorIds { get; set; } = string.Empty;
        public string ExcludedMonitorIds { get; set; } = string.Empty;

        // Frequency / summary
        public bool SummaryEnabled { get; set; } = false;
        public SummaryFrequency SummaryFrequency { get; set; } = SummaryFrequency.Weekly;
        public DayOfWeek SummaryDay { get; set; } = DayOfWeek.Sunday;
        public bool SummaryIncludeMonitors { get; set; } = true;
        public bool SummaryIncludeCloud { get; set; } = true;

        // Quiet hours
        public bool QuietHoursEnabled { get; set; } = false;
        public TimeSpan QuietHoursStart { get; set; } = new TimeSpan(22, 0, 0);
        public TimeSpan QuietHoursEnd { get; set; } = new TimeSpan(8, 0, 0);
        public string QuietHoursTimezone { get; set; } = "America/Lima";
        public bool QuietHoursExcludeWeekends { get; set; } = false;

        // Anti-spam / deduplication
        public int DeduplicationMinutes { get; set; } = 15;
        public bool GroupSimilarIncidents { get; set; } = true;
        public int CooldownMinutes { get; set; } = 5;

        // Additional recipients
        public string AdditionalEmails { get; set; } = string.Empty;

        // Email template preferences
        public EmailTemplateType EmailTemplate { get; set; } = EmailTemplateType.Detailed;
        public bool IncludeTimeline { get; set; } = true;
        public bool IncludeMetrics { get; set; } = true;
        public bool IncludeDirectLinks { get; set; } = true;
        public bool IncludeCurrentStatus { get; set; } = true;

        // Language
        public NotificationLanguage Language { get; set; } = NotificationLanguage.Spanish;

        // Tenant branding override
        public string? CustomTenantName { get; set; }
        public string? CustomTenantLogoUrl { get; set; }
        public string? CustomTenantColor { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public Tenant Tenant { get; set; } = null!;

        public List<Guid> GetSelectedProviderIds()
        {
            if (string.IsNullOrWhiteSpace(SelectedCloudProviderIds)) return new List<Guid>();
            var ids = new List<Guid>();
            foreach (var part in SelectedCloudProviderIds.Split(',', StringSplitOptions.RemoveEmptyEntries))
            {
                if (Guid.TryParse(part.Trim(), out var id)) ids.Add(id);
            }
            return ids;
        }

        public void SetSelectedProviderIds(IEnumerable<Guid> ids)
        {
            SelectedCloudProviderIds = string.Join(",", ids);
        }

        public List<Guid> GetSelectedMonitorIds()
        {
            if (string.IsNullOrWhiteSpace(SelectedMonitorIds)) return new List<Guid>();
            var ids = new List<Guid>();
            foreach (var part in SelectedMonitorIds.Split(',', StringSplitOptions.RemoveEmptyEntries))
            {
                if (Guid.TryParse(part.Trim(), out var id)) ids.Add(id);
            }
            return ids;
        }

        public void SetSelectedMonitorIds(IEnumerable<Guid> ids)
        {
            SelectedMonitorIds = string.Join(",", ids);
        }

        public List<Guid> GetExcludedMonitorIds()
        {
            if (string.IsNullOrWhiteSpace(ExcludedMonitorIds)) return new List<Guid>();
            var ids = new List<Guid>();
            foreach (var part in ExcludedMonitorIds.Split(',', StringSplitOptions.RemoveEmptyEntries))
            {
                if (Guid.TryParse(part.Trim(), out var id)) ids.Add(id);
            }
            return ids;
        }

        public void SetExcludedMonitorIds(IEnumerable<Guid> ids)
        {
            ExcludedMonitorIds = string.Join(",", ids);
        }

        public List<string> GetAdditionalEmails()
        {
            if (string.IsNullOrWhiteSpace(AdditionalEmails)) return new List<string>();
            var emails = new List<string>();
            foreach (var part in AdditionalEmails.Split(',', StringSplitOptions.RemoveEmptyEntries))
            {
                var trimmed = part.Trim();
                if (!string.IsNullOrWhiteSpace(trimmed)) emails.Add(trimmed);
            }
            return emails;
        }

        public void SetAdditionalEmails(IEnumerable<string> emails)
        {
            AdditionalEmails = string.Join(",", emails);
        }
    }
}
