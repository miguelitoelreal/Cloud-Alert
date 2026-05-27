using System;

namespace MonitoringPlatform.Application.DTOs
{
    public class DueMonitorDto
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public string Name { get; set; } = null!;
        public string Url { get; set; } = null!;
        public int IntervalInSeconds { get; set; }
    }

    public class RecordMonitorCheckDto
    {
        public Guid MonitorId { get; set; }
        public int Status { get; set; }
        public int? StatusCode { get; set; }
        public long? ResponseTimeMs { get; set; }
        public DateTime CheckedAt { get; set; }
        public string? ErrorMessage { get; set; }
    }

    public class RecordedMonitorCheckDto
    {
        public DashboardMonitorSummaryDto Monitor { get; set; } = null!;
        public MonitorLogDto Log { get; set; } = null!;
    }
}
