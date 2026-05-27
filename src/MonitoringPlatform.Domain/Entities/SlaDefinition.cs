namespace MonitoringPlatform.Domain.Entities
{
    public class SlaDefinition
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public string Name { get; set; } = null!;
        public decimal TargetUptimePercent { get; set; }
        public int MeasurementWindowDays { get; set; }
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAtUtc { get; set; }
        public Guid? CreatedByUserId { get; set; }
        public Guid? UpdatedByUserId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public Tenant Tenant { get; set; } = null!;
        public ICollection<SlaReport> Reports { get; set; } = new List<SlaReport>();
    }
}
