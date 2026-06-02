namespace MonitoringPlatform.Application.Interfaces
{
    public interface IHealthScoreService
    {
        Task<decimal> CalculateTenantScoreAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default);
    }
}
