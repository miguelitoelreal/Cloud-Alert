using MonitoringPlatform.Domain.Entities;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface IServiceDependencyRepository
    {
        Task<IReadOnlyList<ServiceDependency>> GetByTenantAsync(Guid tenantId, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<ServiceDependency>> GetBySourceMonitorAsync(Guid monitorId, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<ServiceDependency>> GetByTargetMonitorAsync(Guid monitorId, CancellationToken cancellationToken = default);
        Task AddAsync(ServiceDependency dependency, CancellationToken cancellationToken = default);
        Task SoftDeleteAsync(Guid id, CancellationToken cancellationToken = default);
    }
}
