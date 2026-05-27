using MonitoringPlatform.Domain.Enums;

namespace MonitoringPlatform.Domain.Entities
{
    public class Customer
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }

        public string CompanyName { get; set; } = null!;
        public string ContactName { get; set; } = null!;
        public string ContactEmail { get; set; } = null!;
        public string? ContactPhone { get; set; }
        public CustomerType CustomerType { get; set; }
        public string? Industry { get; set; }
        public string? Notes { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public Tenant Tenant { get; set; } = null!;
        public ICollection<CustomerCloudProvider> CustomerCloudProviders { get; set; } = new List<CustomerCloudProvider>();
    }
}
