namespace MonitoringPlatform.Domain.Entities
{
    public class CloudAlertSubscriptionService
    {
        public Guid Id { get; set; }
        public Guid SubscriptionId { get; set; }
        public string ServiceName { get; set; } = null!;
        public DateTime CreatedAt { get; set; }

        public CloudAlertSubscription Subscription { get; set; } = null!;
    }
}
