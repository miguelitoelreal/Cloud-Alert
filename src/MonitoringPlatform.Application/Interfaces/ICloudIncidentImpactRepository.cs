using MonitoringPlatform.Domain.Entities;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface ICloudIncidentImpactRepository
    {
        Task<IReadOnlyList<CloudIncidentImpact>> GetByIncidentIdAsync(
            Guid incidentId,
            CancellationToken cancellationToken = default);

        Task<IReadOnlyList<CloudIncidentImpact>> GetActiveByTenantAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default);

        Task AddAsync(CloudIncidentImpact impact, CancellationToken cancellationToken = default);
    }
}
