namespace MonitoringPlatform.Domain.Entities
{
    public enum NotificationChannelType
    {
        Email = 1,
        Slack = 2,
        Teams = 3,
        Discord = 4,
        Telegram = 5,
        Webhook = 6,
    }

    public class NotificationChannelConfig
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public NotificationChannelType ChannelType { get; set; }
        public string Name { get; set; } = null!;
        public string ConfigJson { get; set; } = null!;
        public bool IsEnabled { get; set; } = true;
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAtUtc { get; set; }
        public Guid? CreatedByUserId { get; set; }
        public Guid? UpdatedByUserId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public Tenant Tenant { get; set; } = null!;
    }
}
