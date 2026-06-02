using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;

namespace MonitoringPlatform.Application.Services
{
    internal class CloudImpactAssessmentServiceStub : ICloudImpactAssessmentService
    {
        public Task<IReadOnlyList<CloudIncidentImpactDto>> AssessImpactAsync(
            Guid tenantId,
            Guid cloudIncidentId,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<CloudIncidentImpactDto>>([]);
        }

        public Task<IReadOnlyList<CloudIncidentImpactDto>> GetActiveImpactsAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<CloudIncidentImpactDto>>([]);
        }

        public Task AssessImpactForRecentIncidentsAsync(
            CancellationToken cancellationToken = default)
        {
            return Task.CompletedTask;
        }
    }
}
