using MonitoringPlatform.Application.DTOs;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface ICloudStatusIngestionRepository
    {
        Task SyncProvidersAsync(IReadOnlyCollection<CloudProviderSeedDto> providers, CancellationToken cancellationToken);

        Task<IReadOnlyList<CloudProviderIngestionTargetDto>> GetEnabledProvidersAsync(CancellationToken cancellationToken);

        Task<CloudStatusProviderIngestionResultDto> UpsertIncidentsAsync(
            CloudProviderIngestionTargetDto provider,
            IReadOnlyCollection<CloudIncidentIngestionDto> incidents,
            DateTime syncedAtUtc,
            CancellationToken cancellationToken);

        Task<CloudStatusProviderIngestionResultDto> MarkSyncFailureAsync(
            CloudProviderIngestionTargetDto provider,
            DateTime syncedAtUtc,
            string error,
            CancellationToken cancellationToken);
    }
}
