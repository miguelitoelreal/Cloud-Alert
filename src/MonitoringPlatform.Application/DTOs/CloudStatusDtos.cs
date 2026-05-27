using MonitoringPlatform.Domain.Enums;

namespace MonitoringPlatform.Application.DTOs
{
    public class CloudStatusQueryDto
    {
        public string? Provider { get; set; }
        public int? Severity { get; set; }
        public bool ActiveOnly { get; set; }
        public int Take { get; set; } = 100;
    }

    public class CloudStatusOverviewDto
    {
        public CloudStatusSummaryDto Summary { get; set; } = new();
        public IReadOnlyList<CloudProviderDto> Providers { get; set; } = [];
        public IReadOnlyList<CloudIncidentDto> Incidents { get; set; } = [];
    }

    public class CloudStatusSummaryDto
    {
        public int TotalProviders { get; set; }
        public int ActiveIncidents { get; set; }
        public int CriticalOutages { get; set; }
        public int OperationalServices { get; set; }
        public DateTime? LastUpdatedAt { get; set; }
    }

    public class CloudProviderDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = null!;
        public string Slug { get; set; } = null!;
        public string LogoUrl { get; set; } = null!;
        public CloudStatusSourceType SourceType { get; set; }
        public string? StatusPageUrl { get; set; }
        public bool IsEnabled { get; set; }
        public DateTime? LastSyncedAt { get; set; }
        public string? LastSyncError { get; set; }
        public int ActiveIncidents { get; set; }
    }

    public class CloudIncidentDto
    {
        public Guid Id { get; set; }
        public Guid ProviderId { get; set; }
        public string ProviderName { get; set; } = null!;
        public string ProviderSlug { get; set; } = null!;
        public string ProviderLogoUrl { get; set; } = null!;
        public string Title { get; set; } = null!;
        public string Description { get; set; } = null!;
        public CloudIncidentSeverity Severity { get; set; }
        public CloudIncidentStatus Status { get; set; }
        public string? Region { get; set; }
        public IReadOnlyList<string> AffectedServices { get; set; } = [];
        public string Source { get; set; } = null!;
        public string OfficialUrl { get; set; } = null!;
        public bool IsActive { get; set; }
        public DateTime OccurredAt { get; set; }
        public DateTime LastUpdatedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public string DisplayStatus { get; set; } = null!;
    }

    public class CloudProviderSeedDto
    {
        public string Name { get; set; } = null!;
        public string Slug { get; set; } = null!;
        public string LogoUrl { get; set; } = null!;
        public CloudStatusSourceType SourceType { get; set; }
        public string SourceUrl { get; set; } = null!;
        public string? StatusPageUrl { get; set; }
        public string? MetadataJson { get; set; }
        public bool IsEnabled { get; set; } = true;
    }

    public class CloudProviderIngestionTargetDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = null!;
        public string Slug { get; set; } = null!;
        public string LogoUrl { get; set; } = null!;
        public CloudStatusSourceType SourceType { get; set; }
        public string SourceUrl { get; set; } = null!;
        public string? StatusPageUrl { get; set; }
        public string? MetadataJson { get; set; }
        public bool IsEnabled { get; set; }
    }

    public class CloudIncidentIngestionDto
    {
        public string ExternalId { get; set; } = null!;
        public string Title { get; set; } = null!;
        public string Description { get; set; } = null!;
        public CloudIncidentSeverity Severity { get; set; }
        public CloudIncidentStatus Status { get; set; }
        public string? Region { get; set; }
        public IReadOnlyList<string> AffectedServices { get; set; } = [];
        public string Source { get; set; } = null!;
        public string OfficialUrl { get; set; } = null!;
        public DateTime OccurredAt { get; set; }
        public DateTime LastUpdatedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
    }

    public class CloudStatusProviderIngestionResultDto
    {
        public string ProviderName { get; set; } = null!;
        public string ProviderSlug { get; set; } = null!;
        public bool Success { get; set; }
        public int FetchedIncidents { get; set; }
        public int InsertedIncidents { get; set; }
        public int UpdatedIncidents { get; set; }
        public string? Error { get; set; }
    }

    public class CloudStatusIngestionResultDto
    {
        public int ProcessedProviders { get; set; }
        public int SuccessfulProviders { get; set; }
        public int FailedProviders { get; set; }
        public int ChangedIncidents { get; set; }
        public IReadOnlyList<CloudStatusProviderIngestionResultDto> ProviderResults { get; set; } = [];
    }

    public class CloudIncidentTranslationRequestDto
    {
        public string? IncidentId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }

    public class CloudIncidentTranslationDto
    {
        public string TranslatedTitle { get; set; } = string.Empty;
        public string TranslatedDescription { get; set; } = string.Empty;
    }
}
