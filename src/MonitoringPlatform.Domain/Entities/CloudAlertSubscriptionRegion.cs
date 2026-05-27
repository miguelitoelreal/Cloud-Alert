namespace MonitoringPlatform.Domain.Entities
{
    public class CloudAlertSubscriptionRegion
    {
        public Guid Id { get; set; }
        public Guid SubscriptionId { get; set; }
        public string RegionName { get; set; } = null!;
        public DateTime CreatedAt { get; set; }

        public CloudAlertSubscription Subscription { get; set; } = null!;
    }
}
