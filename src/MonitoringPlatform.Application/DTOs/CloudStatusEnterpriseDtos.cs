using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Domain.Enums;

namespace MonitoringPlatform.Application.DTOs
{
    // ─── Incident Events & Correlation ─────────────────────────────

    public class CloudIncidentEventDto
    {
        public Guid Id { get; set; }
        public Guid CloudIncidentId { get; set; }
        public CloudIncidentStatus PreviousStatus { get; set; }
        public CloudIncidentStatus NewStatus { get; set; }
        public CloudIncidentSeverity? PreviousSeverity { get; set; }
        public CloudIncidentSeverity? NewSeverity { get; set; }
        public string? EventDescription { get; set; }
        public DateTime OccurredAt { get; set; }
    }

    public class CloudIncidentGroupDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = null!;
        public string? RootCause { get; set; }
        public DateTime DetectedAt { get; set; }
        public IReadOnlyList<CloudIncidentCorrelationDto> Correlations { get; set; } = [];
    }

    public class CloudIncidentCorrelationDto
    {
        public Guid Id { get; set; }
        public Guid CloudIncidentId { get; set; }
        public string IncidentTitle { get; set; } = null!;
        public string? ProviderName { get; set; }
        public double CorrelationScore { get; set; }
        public string? CorrelationReason { get; set; }
    }

    // ─── Impact Assessment ─────────────────────────────────────────

    public class CloudIncidentImpactDto
    {
        public Guid Id { get; set; }
        public Guid CloudIncidentId { get; set; }
        public string IncidentTitle { get; set; } = null!;
        public Guid MonitorId { get; set; }
        public string MonitorName { get; set; } = null!;
        public ImpactLevel ImpactLevel { get; set; }
        public string? AffectedRegion { get; set; }
        public string? AffectedService { get; set; }
        public string? Reason { get; set; }
        public DateTime CalculatedAt { get; set; }
    }

    // ─── Analytics ─────────────────────────────────────────────────

    public class CloudProviderAnalyticsDto
    {
        public Guid ProviderId { get; set; }
        public string ProviderName { get; set; } = null!;
        public string ProviderSlug { get; set; } = null!;
        public decimal UptimePercent { get; set; }
        public int IncidentCount { get; set; }
        public int AvgMttrMinutes { get; set; }
        public int DowntimeMinutes { get; set; }
        public IReadOnlyList<CloudIncidentSeverityCountDto> SeverityDistribution { get; set; } = [];
        public IReadOnlyList<CloudIncidentTrendDto> Trends { get; set; } = [];
    }

    public class CloudIncidentSeverityCountDto
    {
        public CloudIncidentSeverity Severity { get; set; }
        public int Count { get; set; }
    }

    public class CloudIncidentTrendDto
    {
        public DateTime Date { get; set; }
        public int ActiveIncidents { get; set; }
        public int ResolvedIncidents { get; set; }
    }

    public class CloudStatusAnalyticsRequestDto
    {
        public DateTime? From { get; set; }
        public DateTime? To { get; set; }
        public string? ProviderSlug { get; set; }
    }

    // ─── Provider Detail ───────────────────────────────────────────

    public class CloudProviderDetailDto
    {
        public CloudProviderDto Provider { get; set; } = null!;
        public IReadOnlyList<CloudIncidentDto> RecentIncidents { get; set; } = [];
        public IReadOnlyList<CloudIncidentEventDto> RecentEvents { get; set; } = [];
        public CloudProviderAnalyticsDto? Analytics { get; set; }
        public IReadOnlyList<string> AffectedRegions { get; set; } = [];
        public IReadOnlyList<string> AffectedServices { get; set; } = [];
    }

    // ─── Subscriptions ─────────────────────────────────────────────

    public class CloudAlertSubscriptionDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = null!;
        public CloudIncidentSeverity MinSeverity { get; set; }
        public bool IsEnabled { get; set; }
        public bool QuietHoursEnabled { get; set; }
        public TimeSpan QuietHoursStart { get; set; }
        public TimeSpan QuietHoursEnd { get; set; }
        public string QuietHoursTimezone { get; set; } = null!;
        public bool QuietHoursExcludeWeekends { get; set; }
        public int DeduplicationMinutes { get; set; }
        public int CooldownMinutes { get; set; }
        public bool GroupSimilarIncidents { get; set; }
        public IReadOnlyList<Guid> ProviderIds { get; set; } = [];
        public IReadOnlyList<string> Services { get; set; } = [];
        public IReadOnlyList<string> Regions { get; set; } = [];
    }

    public class CloudAlertSubscriptionCreateDto
    {
        public string Name { get; set; } = null!;
        public CloudIncidentSeverity MinSeverity { get; set; }
        public IReadOnlyList<Guid> ProviderIds { get; set; } = [];
        public IReadOnlyList<string> Services { get; set; } = [];
        public IReadOnlyList<string> Regions { get; set; } = [];
    }

    // ─── Status Page ───────────────────────────────────────────────

    public class TenantStatusPageSettingsDto
    {
        public Guid Id { get; set; }
        public bool IsEnabled { get; set; }
        public string Slug { get; set; } = null!;
        public string? Title { get; set; }
        public string? LogoUrl { get; set; }
        public string? PrimaryColor { get; set; }
        public bool ShowUptime { get; set; }
        public bool ShowIncidents { get; set; }
        public string? PublicDomain { get; set; }
    }

    public class TenantStatusPageSettingsCreateDto
    {
        public string Slug { get; set; } = null!;
        public string? Title { get; set; }
        public string? LogoUrl { get; set; }
        public string? PrimaryColor { get; set; }
        public bool ShowUptime { get; set; } = true;
        public bool ShowIncidents { get; set; } = true;
        public string? PublicDomain { get; set; }
    }

    // ─── Dependencies ──────────────────────────────────────────────

    public class ServiceDependencyDto
    {
        public Guid Id { get; set; }
        public Guid SourceMonitorId { get; set; }
        public string SourceMonitorName { get; set; } = null!;
        public Guid TargetMonitorId { get; set; }
        public string TargetMonitorName { get; set; } = null!;
        public DependencyType DependencyType { get; set; }
    }

    // ─── SLA ───────────────────────────────────────────────────────

    public class SlaDefinitionDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = null!;
        public decimal TargetUptimePercent { get; set; }
        public int MeasurementWindowDays { get; set; }
    }

    public class SlaReportDto
    {
        public Guid Id { get; set; }
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
        public decimal ActualUptimePercent { get; set; }
        public int DowntimeMinutes { get; set; }
        public int BreachCount { get; set; }
    }

    // ─── Automation ────────────────────────────────────────────────

    public class AutomationRuleDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = null!;
        public AutomationTriggerType TriggerType { get; set; }
        public string ConditionJson { get; set; } = null!;
        public AutomationActionType ActionType { get; set; }
        public string ActionConfigJson { get; set; } = null!;
        public bool IsEnabled { get; set; }
        public DateTime? LastTriggeredAt { get; set; }
    }

    // ─── Notification Channels ─────────────────────────────────────

    public class NotificationChannelConfigDto
    {
        public Guid Id { get; set; }
        public NotificationChannelType ChannelType { get; set; }
        public string Name { get; set; } = null!;
        public string ConfigJson { get; set; } = null!;
        public bool IsEnabled { get; set; }
    }

    // ─── Event Log ─────────────────────────────────────────────────

    public class CloudStatusEventLogDto
    {
        public Guid Id { get; set; }
        public CloudStatusEventType EventType { get; set; }
        public Guid? CloudIncidentId { get; set; }
        public Guid? CloudProviderId { get; set; }
        public string? PayloadJson { get; set; }
        public DateTime OccurredAt { get; set; }
    }
}
