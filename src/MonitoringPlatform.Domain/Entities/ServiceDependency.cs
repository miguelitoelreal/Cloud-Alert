namespace MonitoringPlatform.Domain.Entities
{
    public enum DependencyType
    {
        DependsOn = 1,
        RequiredBy = 2,
        Related = 3,
    }

    public class ServiceDependency
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Guid SourceMonitorId { get; set; }
        public Guid TargetMonitorId { get; set; }
        public DependencyType DependencyType { get; set; }
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAtUtc { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public Tenant Tenant { get; set; } = null!;
        public Monitor SourceMonitor { get; set; } = null!;
        public Monitor TargetMonitor { get; set; } = null!;
    }
}
