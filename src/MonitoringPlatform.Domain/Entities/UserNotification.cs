using System;

namespace MonitoringPlatform.Domain.Entities;

public class UserNotification
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Tenant? Tenant { get; set; }
    public Guid TenantId { get; set; }
    public string NotificationType { get; set; } = string.Empty; // "monitor_offline", "cloud_incident", "sla_breach"
    public string? ResourceId { get; set; } // MonitorId or IncidentId
    public string? ResourceTitle { get; set; }
    public string? ResourceUrl { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? ReadAtUtc { get; set; }
}
