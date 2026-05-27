using MonitoringPlatform.Domain.Entities;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface ICloudStatusEventLogRepository
    {
        Task<IReadOnlyList<CloudStatusEventLog>> GetByTenantAsync(
            Guid tenantId,
            int take = 100,
            CancellationToken cancellationToken = default);

        Task<IReadOnlyList<CloudStatusEventLog>> GetByTenantAndTypeAsync(
            Guid tenantId,
            CloudStatusEventType eventType,
            int take = 100,
            CancellationToken cancellationToken = default);

        Task AddAsync(CloudStatusEventLog evt, CancellationToken cancellationToken = default);
    }
}
