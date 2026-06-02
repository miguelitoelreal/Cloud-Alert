using MonitoringPlatform.Application.DTOs;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface ICloudProviderDetailService
    {
        Task<CloudProviderDetailDto?> GetProviderDetailAsync(
            Guid tenantId,
            string providerSlug,
            CancellationToken cancellationToken = default);
    }
}
