using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.Infrastructure.Repositories
{
    public class NotificationChannelConfigRepository : INotificationChannelConfigRepository
    {
        private readonly AppDbContext _context;
        private readonly ICurrentUserContext _currentUser;

        public NotificationChannelConfigRepository(AppDbContext context, ICurrentUserContext currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task<IReadOnlyList<NotificationChannelConfig>> GetByTenantAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default)
        {
            return await _context.NotificationChannelConfigs
                .AsNoTracking()
                .Where(x => x.TenantId == tenantId && !x.IsDeleted)
                .ToListAsync(cancellationToken);
        }

        public async Task<NotificationChannelConfig?> GetByIdAsync(
            Guid id,
            CancellationToken cancellationToken = default)
        {
            return await _context.NotificationChannelConfigs
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id && x.TenantId == _currentUser.TenantId && !x.IsDeleted, cancellationToken);
        }

        public async Task<IReadOnlyList<NotificationChannelConfig>> GetEnabledByTenantAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default)
        {
            return await _context.NotificationChannelConfigs
                .AsNoTracking()
                .Where(x => x.TenantId == tenantId && x.IsEnabled && !x.IsDeleted)
                .ToListAsync(cancellationToken);
        }

        public async Task AddAsync(NotificationChannelConfig config, CancellationToken cancellationToken = default)
        {
            _context.NotificationChannelConfigs.Add(config);
            await _context.SaveChangesAsync(cancellationToken);
        }

        public async Task UpdateAsync(NotificationChannelConfig config, CancellationToken cancellationToken = default)
        {
            _context.NotificationChannelConfigs.Update(config);
            await _context.SaveChangesAsync(cancellationToken);
        }

        public async Task SoftDeleteAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var entity = await _context.NotificationChannelConfigs
                .FirstOrDefaultAsync(x => x.Id == id && x.TenantId == _currentUser.TenantId && !x.IsDeleted, cancellationToken);
            if (entity is not null)
            {
                entity.IsDeleted = true;
                entity.DeletedAtUtc = DateTime.UtcNow;
                await _context.SaveChangesAsync(cancellationToken);
            }
        }
    }
}
