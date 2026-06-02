using System;

namespace MonitoringPlatform.Application.DTOs
{
    public class MonitorLogResponseDto
    {
        public Guid Id { get; set; }
        public Guid MonitorId { get; set; }
        public int Status { get; set; }
        public int? StatusCode { get; set; }
        public long? ResponseTimeMs { get; set; }
        public long? DnsTimeMs { get; set; }
        public long? ConnectTimeMs { get; set; }
        public long? TlsTimeMs { get; set; }
        public long? TtfbTimeMs { get; set; }
        public DateTime CheckedAt { get; set; }
        public string? ErrorMessage { get; set; }
    }
}
