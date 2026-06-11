using MonitoringPlatform.Domain.Enums;

namespace MonitoringPlatform.Domain.Entities
{
    public class CloudIncident
    {
        public Guid Id { get; set; }
        public Guid CloudProviderId { get; set; }
        public string ExternalId { get; set; } = null!;
        public string Title { get; set; } = null!;
        public string Description { get; set; } = null!;
        public CloudIncidentSeverity Severity { get; set; }
        public CloudIncidentStatus Status { get; set; }
        public string? Region { get; set; }
        public string? AffectedServicesJson { get; set; }
        public string Source { get; set; } = null!;
        public string OfficialUrl { get; set; } = null!;
        public bool IsActive { get; set; }
        public DateTime OccurredAt { get; set; }
        public DateTime LastUpdatedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public CloudProvider CloudProvider { get; set; } = null!;
    }
}
