using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Domain.Enums;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface ICloudStatusSourceAdapter
    {
        bool CanHandle(CloudStatusSourceType sourceType);

        Task<IReadOnlyList<CloudIncidentIngestionDto>> GetIncidentsAsync(
            CloudProviderIngestionTargetDto provider,
            CancellationToken cancellationToken);
    }
}
