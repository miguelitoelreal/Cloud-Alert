using MonitoringPlatform.Application.DTOs;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface ICloudStatusAnalyticsService
    {
        Task<IReadOnlyList<CloudProviderAnalyticsDto>> GetProviderAnalyticsAsync(
            Guid tenantId,
            CloudStatusAnalyticsRequestDto request,
            CancellationToken cancellationToken = default);

        Task<CloudProviderAnalyticsDto?> GetProviderAnalyticsAsync(
            Guid tenantId,
            string providerSlug,
            CloudStatusAnalyticsRequestDto request,
            CancellationToken cancellationToken = default);
    }
}
