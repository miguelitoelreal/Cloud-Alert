namespace MonitoringPlatform.Application.DTOs.Microsoft;

public class MicrosoftIntegrationDto
{
    public Guid Id { get; set; }

    public string MicrosoftTenantId { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}