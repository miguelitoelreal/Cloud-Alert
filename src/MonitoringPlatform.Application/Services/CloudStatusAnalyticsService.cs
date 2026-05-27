using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;

namespace MonitoringPlatform.Application.Services
{
    internal class CloudStatusAnalyticsServiceStub : ICloudStatusAnalyticsService
    {
        public Task<IReadOnlyList<CloudProviderAnalyticsDto>> GetProviderAnalyticsAsync(
            Guid tenantId,
            CloudStatusAnalyticsRequestDto request,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<CloudProviderAnalyticsDto>>([]);
        }

        public Task<CloudProviderAnalyticsDto?> GetProviderAnalyticsAsync(
            Guid tenantId,
            string providerSlug,
            CloudStatusAnalyticsRequestDto request,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult<CloudProviderAnalyticsDto?>(null);
        }
    }
}
