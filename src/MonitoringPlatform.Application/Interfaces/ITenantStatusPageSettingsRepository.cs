using MonitoringPlatform.Domain.Entities;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface ITenantStatusPageSettingsRepository
    {
        Task<TenantStatusPageSettings?> GetByTenantAsync(Guid tenantId, CancellationToken cancellationToken = default);
        Task<TenantStatusPageSettings?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default);
        Task AddAsync(TenantStatusPageSettings settings, CancellationToken cancellationToken = default);
        Task UpdateAsync(TenantStatusPageSettings settings, CancellationToken cancellationToken = default);
        Task SoftDeleteAsync(Guid id, CancellationToken cancellationToken = default);
    }
}
