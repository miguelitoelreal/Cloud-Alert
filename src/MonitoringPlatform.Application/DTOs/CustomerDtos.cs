using MonitoringPlatform.Domain.Enums;

namespace MonitoringPlatform.Application.DTOs
{
    public class CustomerDto
    {
        public Guid Id { get; set; }
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
        public List<CloudProviderSummaryDto> CloudProviders { get; set; } = [];
    }

    public class CloudProviderSummaryDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = null!;
        public string Slug { get; set; } = null!;
    }

    public class CreateCustomerRequestDto
    {
        public string CompanyName { get; set; } = null!;
        public string ContactName { get; set; } = null!;
        public string ContactEmail { get; set; } = null!;
        public string? ContactPhone { get; set; }
        public CustomerType CustomerType { get; set; }
        public string? Industry { get; set; }
        public string? Notes { get; set; }
        public List<Guid> CloudProviderIds { get; set; } = [];
    }

    public class UpdateCustomerRequestDto
    {
        public string CompanyName { get; set; } = null!;
        public string ContactName { get; set; } = null!;
        public string ContactEmail { get; set; } = null!;
        public string? ContactPhone { get; set; }
        public CustomerType CustomerType { get; set; }
        public string? Industry { get; set; }
        public string? Notes { get; set; }
        public bool IsActive { get; set; }
        public List<Guid> CloudProviderIds { get; set; } = [];
    }
}
