namespace MonitoringPlatform.Domain.Entities
{
    public class CloudProviderUptimeSnapshot
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Guid CloudProviderId { get; set; }
        public DateTime Date { get; set; }
        public decimal UptimePercent { get; set; }
        public int IncidentCount { get; set; }
        public int AvgMttrMinutes { get; set; }
        public int DowntimeMinutes { get; set; }
        public DateTime CreatedAt { get; set; }

        public Tenant Tenant { get; set; } = null!;
        public CloudProvider CloudProvider { get; set; } = null!;
    }
}
