using MonitoringPlatform.Domain.Entities;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface ISlaDefinitionRepository
    {
        Task<IReadOnlyList<SlaDefinition>> GetByTenantAsync(Guid tenantId, CancellationToken cancellationToken = default);
        Task<SlaDefinition?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task AddAsync(SlaDefinition definition, CancellationToken cancellationToken = default);
        Task UpdateAsync(SlaDefinition definition, CancellationToken cancellationToken = default);
        Task SoftDeleteAsync(Guid id, CancellationToken cancellationToken = default);
    }
}
