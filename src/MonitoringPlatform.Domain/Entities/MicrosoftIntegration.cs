namespace MonitoringPlatform.Domain.Entities;

public class MicrosoftIntegration
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }

    public string MicrosoftTenantId { get; set; } = string.Empty;

    public string ClientId { get; set; } = string.Empty;

    public string ClientSecret { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public Tenant Tenant { get; set; } = null!;
}