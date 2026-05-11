using System;
using System.Text.Json.Serialization;

namespace CloudAlertApp.Models
{
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum LatencyProbeProtocol
    {
        Auto,
        Icmp,
        Http
    }

    public class LatencyProbeRequest
    {
        public string ServiceName { get; set; } = string.Empty;
        public string EndpointUrl { get; set; } = string.Empty;
        public LatencyProbeProtocol Protocol { get; set; } = LatencyProbeProtocol.Auto;
    }

    public class LatencyProbeResponse
    {
        public string ServiceName { get; set; } = string.Empty;
        public string EndpointUrl { get; set; } = string.Empty;
        public string Protocol { get; set; } = string.Empty;
        public int ProbeCount { get; set; }
        public int SuccessCount { get; set; }
        public double MinMs { get; set; }
        public double AvgMs { get; set; }
        public double MaxMs { get; set; }
        public double DnsMs { get; set; }
        public double ConnectMs { get; set; }
        public double TlsMs { get; set; }
        public double ResponseMs { get; set; }
        public double TotalMs { get; set; }
        public int? StatusCode { get; set; }
        public bool IsContentValid { get; set; }
        public bool IsStable { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? ErrorMessage { get; set; }
        public DateTimeOffset MeasuredAtUtc { get; set; }
    }

    public class LatencyMeasurement
    {
        public int Id { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public string EndpointUrl { get; set; } = string.Empty;
        public string Protocol { get; set; } = string.Empty;
        public int ProbeCount { get; set; }
        public int SuccessCount { get; set; }
        public double MinMs { get; set; }
        public double AvgMs { get; set; }
        public double MaxMs { get; set; }
        public double DnsMs { get; set; }
        public double ConnectMs { get; set; }
        public double TlsMs { get; set; }
        public double ResponseMs { get; set; }
        public double TotalMs { get; set; }
        public int? StatusCode { get; set; }
        public bool IsContentValid { get; set; }
        public bool IsStable { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? ErrorMessage { get; set; }
        public DateTimeOffset MeasuredAtUtc { get; set; } = DateTimeOffset.UtcNow;
    }
}
