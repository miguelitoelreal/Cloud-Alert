using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;

namespace MonitoringPlatform.Application.Services
{
    internal class CloudIncidentCorrelationServiceStub : ICloudIncidentCorrelationService
    {
        public Task<IReadOnlyList<CloudIncidentGroupDto>> DetectAndGroupAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<CloudIncidentGroupDto>>([]);
        }

        public Task<IReadOnlyList<CloudIncidentGroupDto>> GetActiveGroupsAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<CloudIncidentGroupDto>>([]);
        }

        public Task DetectForRecentIncidentsAsync(
            CancellationToken cancellationToken = default)
        {
            return Task.CompletedTask;
        }
    }
}
