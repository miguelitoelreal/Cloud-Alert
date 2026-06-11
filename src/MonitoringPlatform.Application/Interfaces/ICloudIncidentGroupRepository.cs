using MonitoringPlatform.Domain.Entities;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface ICloudIncidentGroupRepository
    {
        Task<IReadOnlyList<CloudIncidentGroup>> GetActiveGroupsAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default);

        Task<CloudIncidentGroup?> GetByIdAsync(
            Guid id,
            CancellationToken cancellationToken = default);

        Task AddAsync(CloudIncidentGroup group, CancellationToken cancellationToken = default);
        Task UpdateAsync(CloudIncidentGroup group, CancellationToken cancellationToken = default);
    }
}
