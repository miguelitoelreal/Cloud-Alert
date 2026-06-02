using MonitoringPlatform.Application.DTOs;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface ICloudStatusRepository
    {
        Task<CloudStatusOverviewDto> GetOverviewAsync(CloudStatusQueryDto query);
        Task<List<CloudProviderTrendDto>> GetProviderTrendsAsync(DateTime startDate, CancellationToken cancellationToken = default);
    }
}
