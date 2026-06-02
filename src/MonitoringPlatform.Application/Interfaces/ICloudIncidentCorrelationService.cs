using MonitoringPlatform.Application.DTOs;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface ICloudIncidentCorrelationService
    {
        Task<IReadOnlyList<CloudIncidentGroupDto>> DetectAndGroupAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default);

        Task<IReadOnlyList<CloudIncidentGroupDto>> GetActiveGroupsAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default);

        Task DetectForRecentIncidentsAsync(
            CancellationToken cancellationToken = default);
    }
}
