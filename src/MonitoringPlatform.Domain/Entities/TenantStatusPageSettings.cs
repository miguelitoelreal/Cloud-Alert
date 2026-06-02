namespace MonitoringPlatform.Domain.Entities
{
    public class TenantStatusPageSettings
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public bool IsEnabled { get; set; } = false;
        public string Slug { get; set; } = null!;
        public string? Title { get; set; }
        public string? LogoUrl { get; set; }
        public string? PrimaryColor { get; set; }
        public bool ShowUptime { get; set; } = true;
        public bool ShowIncidents { get; set; } = true;
        public string? PublicDomain { get; set; }
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAtUtc { get; set; }
        public Guid? CreatedByUserId { get; set; }
        public Guid? UpdatedByUserId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public Tenant Tenant { get; set; } = null!;
    }
}
