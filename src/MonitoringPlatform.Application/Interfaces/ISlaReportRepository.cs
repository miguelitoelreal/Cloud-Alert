using MonitoringPlatform.Domain.Entities;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface ISlaReportRepository
    {
        Task<IReadOnlyList<SlaReport>> GetByDefinitionAsync(Guid slaDefinitionId, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<SlaReport>> GetByTenantAsync(Guid tenantId, CancellationToken cancellationToken = default);
        Task AddAsync(SlaReport report, CancellationToken cancellationToken = default);
    }
}
