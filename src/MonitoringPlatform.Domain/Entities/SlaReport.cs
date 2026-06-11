namespace MonitoringPlatform.Domain.Entities
{
    public class SlaReport
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Guid SlaDefinitionId { get; set; }
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
        public decimal ActualUptimePercent { get; set; }
        public int DowntimeMinutes { get; set; }
        public int BreachCount { get; set; }
        public DateTime CreatedAt { get; set; }

        public Tenant Tenant { get; set; } = null!;
        public SlaDefinition SlaDefinition { get; set; } = null!;
    }
}
