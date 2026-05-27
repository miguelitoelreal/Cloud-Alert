namespace MonitoringPlatform.Domain.Entities
{
    public class TenantSettings
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public string SmtpHost { get; set; } = string.Empty;
        public int SmtpPort { get; set; } = 587;
        public string SmtpUsername { get; set; } = string.Empty;
        public string SmtpPassword { get; set; } = string.Empty;
        public string SenderEmail { get; set; } = string.Empty;
        public string SenderName { get; set; } = string.Empty;
        public bool UseSsl { get; set; } = true;
        public bool EmailEnabled { get; set; } = false;
        public string EmailProvider { get; set; } = "Smtp";
        public string BrevoApiKey { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public Tenant Tenant { get; set; } = null!;
    }
}
