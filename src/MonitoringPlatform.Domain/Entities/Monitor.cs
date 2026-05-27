using System;

namespace MonitoringPlatform.Domain.Entities
{

    public class Monitor
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public string Name { get; set; } = null!;
        public string Url { get; set; } = null!;
        public int IntervalInSeconds { get; set; }
        public MonitorStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public Tenant Tenant { get; set; } = null!;
        public ICollection<MonitorLog> Logs { get; set; } = new List<MonitorLog>();
    }

    public enum MonitorStatus
    {
        Unknown = 0,
        Online = 1,
        Offline = 2
    }
}
