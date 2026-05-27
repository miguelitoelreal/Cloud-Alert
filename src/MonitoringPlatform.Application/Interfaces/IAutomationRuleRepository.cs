using MonitoringPlatform.Domain.Entities;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface IAutomationRuleRepository
    {
        Task<IReadOnlyList<AutomationRule>> GetByTenantAsync(Guid tenantId, CancellationToken cancellationToken = default);
        Task<AutomationRule?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task AddAsync(AutomationRule rule, CancellationToken cancellationToken = default);
        Task UpdateAsync(AutomationRule rule, CancellationToken cancellationToken = default);
        Task SoftDeleteAsync(Guid id, CancellationToken cancellationToken = default);
    }
}
