namespace MonitoringPlatform.Domain.Entities
{
    public class CustomerCloudProvider
    {
        public Guid CustomerId { get; set; }
        public Guid CloudProviderId { get; set; }

        public Customer Customer { get; set; } = null!;
        public CloudProvider CloudProvider { get; set; } = null!;
    }
}
