namespace MonitoringPlatform.Domain.Entities
{
    public class Tenant
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = null!;
        public string Slug { get; set; } = null!;
        public DateTime CreatedAtUtc { get; set; }

        public ICollection<Monitor> Monitors { get; set; } = new List<Monitor>();
        public ICollection<CloudProvider> CloudProviders { get; set; } = new List<CloudProvider>();
    }
}
