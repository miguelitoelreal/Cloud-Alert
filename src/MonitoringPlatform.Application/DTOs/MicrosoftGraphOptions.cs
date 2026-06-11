namespace MonitoringPlatform.Application.DTOs
{
    public class MicrosoftGraphOptions
    {
        public bool Enabled { get; set; }
        public string TenantId { get; set; } = string.Empty;
        public string ClientId { get; set; } = string.Empty;
        public string ClientSecret { get; set; } = string.Empty;
        public string AuthorityBaseUrl { get; set; } = "https://login.microsoftonline.com";
        public string GraphBaseUrl { get; set; } = "https://graph.microsoft.com/v1.0";
    }
}
