namespace MonitoringPlatform.Domain.Entities
{
    public enum ImpactLevel
    {
        None = 0,
        Low = 1,
        Medium = 2,
        High = 3,
        Critical = 4,
    }

    public class CloudIncidentImpact
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Guid CloudIncidentId { get; set; }
        public Guid MonitorId { get; set; }
        public ImpactLevel ImpactLevel { get; set; }
        public string? AffectedRegion { get; set; }
        public string? AffectedService { get; set; }
        public string? Reason { get; set; }
        public DateTime CalculatedAt { get; set; }
        public DateTime CreatedAt { get; set; }

        public Tenant Tenant { get; set; } = null!;
        public CloudIncident CloudIncident { get; set; } = null!;
        public Monitor Monitor { get; set; } = null!;
    }
}
