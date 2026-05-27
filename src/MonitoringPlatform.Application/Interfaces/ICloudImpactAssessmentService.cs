using MonitoringPlatform.Application.DTOs;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface ICloudImpactAssessmentService
    {
        Task<IReadOnlyList<CloudIncidentImpactDto>> AssessImpactAsync(
            Guid tenantId,
            Guid cloudIncidentId,
            CancellationToken cancellationToken = default);

        Task<IReadOnlyList<CloudIncidentImpactDto>> GetActiveImpactsAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default);

        Task AssessImpactForRecentIncidentsAsync(
            CancellationToken cancellationToken = default);
    }
}
