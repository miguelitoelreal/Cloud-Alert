using MonitoringPlatform.Domain.Enums;

namespace MonitoringPlatform.Domain.Entities
{
    public class CloudAlertSubscription
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Guid UserId { get; set; }
        public string Name { get; set; } = null!;
        public CloudIncidentSeverity MinSeverity { get; set; }
        public bool IsEnabled { get; set; } = true;

        public bool QuietHoursEnabled { get; set; } = false;
        public TimeSpan QuietHoursStart { get; set; } = new TimeSpan(22, 0, 0);
        public TimeSpan QuietHoursEnd { get; set; } = new TimeSpan(8, 0, 0);
        public string QuietHoursTimezone { get; set; } = "America/Lima";
        public bool QuietHoursExcludeWeekends { get; set; } = false;

        public int DeduplicationMinutes { get; set; } = 15;
        public int CooldownMinutes { get; set; } = 5;
        public bool GroupSimilarIncidents { get; set; } = true;

        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAtUtc { get; set; }
        public Guid? CreatedByUserId { get; set; }
        public Guid? UpdatedByUserId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public Tenant Tenant { get; set; } = null!;
        public ICollection<CloudAlertSubscriptionProvider> Providers { get; set; } = new List<CloudAlertSubscriptionProvider>();
        public ICollection<CloudAlertSubscriptionService> Services { get; set; } = new List<CloudAlertSubscriptionService>();
        public ICollection<CloudAlertSubscriptionRegion> Regions { get; set; } = new List<CloudAlertSubscriptionRegion>();
    }
}
