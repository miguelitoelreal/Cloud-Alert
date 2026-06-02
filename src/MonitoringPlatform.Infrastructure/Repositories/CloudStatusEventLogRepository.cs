using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.Infrastructure.Repositories
{
    public class CloudStatusEventLogRepository : ICloudStatusEventLogRepository
    {
        private readonly AppDbContext _context;

        public CloudStatusEventLogRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IReadOnlyList<CloudStatusEventLog>> GetByTenantAsync(
            Guid tenantId,
            int take = 100,
            CancellationToken cancellationToken = default)
        {
            return await _context.CloudStatusEventLogs
                .AsNoTracking()
                .Where(x => x.TenantId == tenantId)
                .OrderByDescending(x => x.OccurredAt)
                .Take(take)
                .ToListAsync(cancellationToken);
        }

        public async Task<IReadOnlyList<CloudStatusEventLog>> GetByTenantAndTypeAsync(
            Guid tenantId,
            CloudStatusEventType eventType,
            int take = 100,
            CancellationToken cancellationToken = default)
        {
            return await _context.CloudStatusEventLogs
                .AsNoTracking()
                .Where(x => x.TenantId == tenantId && x.EventType == eventType)
                .OrderByDescending(x => x.OccurredAt)
                .Take(take)
                .ToListAsync(cancellationToken);
        }

        public async Task AddAsync(CloudStatusEventLog evt, CancellationToken cancellationToken = default)
        {
            _context.CloudStatusEventLogs.Add(evt);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
