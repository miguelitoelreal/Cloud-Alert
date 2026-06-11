using MonitoringPlatform.Domain.Enums;

namespace MonitoringPlatform.Domain.Entities
{
    public class CloudProvider
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public string Name { get; set; } = null!;
        public string Slug { get; set; } = null!;
        public string LogoUrl { get; set; } = null!;
        public CloudStatusSourceType SourceType { get; set; }
        public string SourceUrl { get; set; } = null!;
        public string? StatusPageUrl { get; set; }
        public string? MetadataJson { get; set; }
        public bool IsEnabled { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? LastSyncedAt { get; set; }
        public string? LastSyncError { get; set; }

        public Tenant Tenant { get; set; } = null!;
        public ICollection<CloudIncident> Incidents { get; set; } = new List<CloudIncident>();
    }
}
