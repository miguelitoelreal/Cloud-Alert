using System;

namespace MonitoringPlatform.Application.DTOs
{
    public class DashboardMonitorSummaryDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = null!;
        public string Url { get; set; } = null!;

        public int CurrentStatus { get; set; }
        public DateTime? LastCheckedAt { get; set; }
        public long? LastResponseTimeMs { get; set; }
        public long? LastDnsTimeMs { get; set; }
        public long? LastConnectTimeMs { get; set; }
        public long? LastTlsTimeMs { get; set; }
        public long? LastTtfbTimeMs { get; set; }

        public double? UptimePercentage { get; set; }
        public int TotalChecks { get; set; }
        public int FailedChecks { get; set; }
    }
}
