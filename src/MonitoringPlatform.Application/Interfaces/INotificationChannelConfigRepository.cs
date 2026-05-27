using MonitoringPlatform.Domain.Entities;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface INotificationChannelConfigRepository
    {
        Task<IReadOnlyList<NotificationChannelConfig>> GetByTenantAsync(Guid tenantId, CancellationToken cancellationToken = default);
        Task<NotificationChannelConfig?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<NotificationChannelConfig>> GetEnabledByTenantAsync(Guid tenantId, CancellationToken cancellationToken = default);
        Task AddAsync(NotificationChannelConfig config, CancellationToken cancellationToken = default);
        Task UpdateAsync(NotificationChannelConfig config, CancellationToken cancellationToken = default);
        Task SoftDeleteAsync(Guid id, CancellationToken cancellationToken = default);
    }
}
