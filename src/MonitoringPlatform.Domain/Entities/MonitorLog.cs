using System;

namespace MonitoringPlatform.Domain.Entities
{
    public class MonitorLog
    {
        public Guid Id { get; set; }
        public Guid MonitorId { get; set; }
        public MonitorStatus Status { get; set; }
        public int? StatusCode { get; set; }
        public long? ResponseTimeMs { get; set; }
        public long? DnsTimeMs { get; set; }
        public long? ConnectTimeMs { get; set; }
        public long? TlsTimeMs { get; set; }
        public long? TtfbTimeMs { get; set; }
        public DateTime CheckedAt { get; set; }
        public string? ErrorMessage { get; set; }

        // Relación inversa
        public Monitor Monitor { get; set; } = null!;
    }
}
