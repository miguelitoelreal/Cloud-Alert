using MonitoringPlatform.Domain.Entities;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface ICloudAlertSubscriptionRepository
    {
        Task<IReadOnlyList<CloudAlertSubscription>> GetByTenantAsync(Guid tenantId, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<CloudAlertSubscription>> GetByTenantAndUserAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken = default);
        Task<CloudAlertSubscription?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task AddAsync(CloudAlertSubscription subscription, CancellationToken cancellationToken = default);
        Task UpdateAsync(CloudAlertSubscription subscription, CancellationToken cancellationToken = default);
        Task SoftDeleteAsync(Guid id, CancellationToken cancellationToken = default);
    }
}
