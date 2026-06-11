using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;

namespace MonitoringPlatform.Application.Services
{
    public class CloudProviderDetailService : ICloudProviderDetailService
    {
        public Task<CloudProviderDetailDto?> GetProviderDetailAsync(
            Guid tenantId,
            string providerSlug,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult<CloudProviderDetailDto?>(null);
        }
    }
}
