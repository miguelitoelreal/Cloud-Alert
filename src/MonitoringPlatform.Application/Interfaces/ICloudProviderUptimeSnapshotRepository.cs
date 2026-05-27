using MonitoringPlatform.Domain.Entities;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface ICloudProviderUptimeSnapshotRepository
    {
        Task<IReadOnlyList<CloudProviderUptimeSnapshot>> GetByProviderAsync(
            Guid providerId,
            DateTime? from = null,
            DateTime? to = null,
            CancellationToken cancellationToken = default);

        Task AddAsync(CloudProviderUptimeSnapshot snapshot, CancellationToken cancellationToken = default);
    }
}
