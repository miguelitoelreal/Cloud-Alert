namespace MonitoringPlatform.Domain.Entities
{
    public class CloudAlertSubscriptionProvider
    {
        public Guid Id { get; set; }
        public Guid SubscriptionId { get; set; }
        public Guid CloudProviderId { get; set; }
        public DateTime CreatedAt { get; set; }

        public CloudAlertSubscription Subscription { get; set; } = null!;
        public CloudProvider CloudProvider { get; set; } = null!;
    }
}
