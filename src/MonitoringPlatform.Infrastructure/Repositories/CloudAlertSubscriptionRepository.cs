using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.Infrastructure.Repositories
{
    public class CloudAlertSubscriptionRepository : ICloudAlertSubscriptionRepository
    {
        private readonly AppDbContext _context;
        private readonly ICurrentUserContext _currentUser;

        public CloudAlertSubscriptionRepository(AppDbContext context, ICurrentUserContext currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task<IReadOnlyList<CloudAlertSubscription>> GetByTenantAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default)
        {
            return await _context.CloudAlertSubscriptions
                .AsNoTracking()
                .Where(x => x.TenantId == tenantId && !x.IsDeleted)
                .Include(x => x.Providers)
                .ThenInclude(p => p.CloudProvider)
                .Include(x => x.Services)
                .Include(x => x.Regions)
                .ToListAsync(cancellationToken);
        }

        public async Task<IReadOnlyList<CloudAlertSubscription>> GetByTenantAndUserAsync(
            Guid tenantId,
            Guid userId,
            CancellationToken cancellationToken = default)
        {
            return await _context.CloudAlertSubscriptions
                .AsNoTracking()
                .Where(x => x.TenantId == tenantId && x.UserId == userId && !x.IsDeleted)
                .Include(x => x.Providers)
                .ThenInclude(p => p.CloudProvider)
                .Include(x => x.Services)
                .Include(x => x.Regions)
                .ToListAsync(cancellationToken);
        }

        public async Task<CloudAlertSubscription?> GetByIdAsync(
            Guid id,
            CancellationToken cancellationToken = default)
        {
            return await _context.CloudAlertSubscriptions
                .AsNoTracking()
                .Where(x => x.Id == id && x.TenantId == _currentUser.TenantId && !x.IsDeleted)
                .Include(x => x.Providers)
                .ThenInclude(p => p.CloudProvider)
                .Include(x => x.Services)
                .Include(x => x.Regions)
                .FirstOrDefaultAsync(cancellationToken);
        }

        public async Task AddAsync(CloudAlertSubscription subscription, CancellationToken cancellationToken = default)
        {
            _context.CloudAlertSubscriptions.Add(subscription);
            await _context.SaveChangesAsync(cancellationToken);
        }

        public async Task UpdateAsync(CloudAlertSubscription subscription, CancellationToken cancellationToken = default)
        {
            _context.CloudAlertSubscriptions.Update(subscription);
            await _context.SaveChangesAsync(cancellationToken);
        }

        public async Task SoftDeleteAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var entity = await _context.CloudAlertSubscriptions
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
