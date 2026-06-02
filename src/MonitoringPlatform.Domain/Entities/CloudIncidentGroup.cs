namespace MonitoringPlatform.Domain.Entities
{
    public class CloudIncidentGroup
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public string Title { get; set; } = null!;
        public string? RootCause { get; set; }
        public DateTime DetectedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public Tenant Tenant { get; set; } = null!;
        public ICollection<CloudIncidentCorrelation> Correlations { get; set; } = new List<CloudIncidentCorrelation>();
    }
}
