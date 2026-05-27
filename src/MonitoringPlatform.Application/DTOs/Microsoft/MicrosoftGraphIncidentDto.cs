using MonitoringPlatform.Domain.Enums;

namespace MonitoringPlatform.Application.DTOs.Microsoft;

public class MicrosoftGraphIncidentDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public CloudIncidentSeverity Severity { get; set; }
    public CloudIncidentStatus Status { get; set; }
    public string? Region { get; set; }
    public IReadOnlyList<string> AffectedServices { get; set; } = [];
    public string OfficialUrl { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime OccurredAt { get; set; }
    public DateTime LastUpdatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
}
