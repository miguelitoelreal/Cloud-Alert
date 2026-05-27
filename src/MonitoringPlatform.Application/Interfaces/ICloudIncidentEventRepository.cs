using MonitoringPlatform.Domain.Entities;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface ICloudIncidentEventRepository
    {
        Task<IReadOnlyList<CloudIncidentEvent>> GetByIncidentIdAsync(
            Guid incidentId,
            CancellationToken cancellationToken = default);

        Task AddAsync(CloudIncidentEvent evt, CancellationToken cancellationToken = default);
    }
}
