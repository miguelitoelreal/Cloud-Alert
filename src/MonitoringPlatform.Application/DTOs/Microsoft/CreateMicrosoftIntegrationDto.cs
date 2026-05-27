namespace MonitoringPlatform.Application.DTOs.Microsoft;

public class CreateMicrosoftIntegrationDto
{
    public string MicrosoftTenantId { get; set; } = string.Empty;

    public string ClientId { get; set; } = string.Empty;

    public string ClientSecret { get; set; } = string.Empty;
}