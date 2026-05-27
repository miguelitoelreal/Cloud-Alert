using MonitoringPlatform.Application.Interfaces;

namespace MonitoringPlatform.Application.Services
{
    internal class HealthScoreServiceStub : IHealthScoreService
    {
        public Task<decimal> CalculateTenantScoreAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(100m);
        }
    }
}
