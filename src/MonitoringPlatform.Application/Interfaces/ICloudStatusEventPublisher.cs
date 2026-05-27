using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Domain.Enums;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface ICloudStatusEventPublisher
    {
        Task PublishIncidentCreatedAsync(CloudIncident incident, CancellationToken cancellationToken = default);
        Task PublishIncidentUpdatedAsync(CloudIncident incident, CloudIncidentStatus previousStatus, CancellationToken cancellationToken = default);
        Task PublishIncidentResolvedAsync(CloudIncident incident, CancellationToken cancellationToken = default);
        Task PublishCorrelationDetectedAsync(CloudIncidentGroup group, CancellationToken cancellationToken = default);
        Task PublishImpactDetectedAsync(CloudIncidentImpact impact, CancellationToken cancellationToken = default);
        Task PublishProviderSyncedAsync(Guid providerId, string providerName, CancellationToken cancellationToken = default);
        Task PublishProviderSyncFailedAsync(Guid providerId, string providerName, string error, CancellationToken cancellationToken = default);
    }
}
