using System;

namespace MonitoringPlatform.Application.DTOs
{
    public class MonitorLogDto
    {
        public Guid Id { get; set; }
        public Guid MonitorId { get; set; }
        public int Status { get; set; }
        public int? StatusCode { get; set; }
        public long? ResponseTimeMs { get; set; }
        public DateTime CheckedAt { get; set; }
        public string? ErrorMessage { get; set; }
    }
}
