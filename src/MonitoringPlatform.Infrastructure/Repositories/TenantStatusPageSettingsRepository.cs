using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.Infrastructure.Repositories
{
    public class TenantStatusPageSettingsRepository : ITenantStatusPageSettingsRepository
    {
        private readonly AppDbContext _context;
        private readonly ICurrentUserContext _currentUser;

        public TenantStatusPageSettingsRepository(AppDbContext context, ICurrentUserContext currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task<TenantStatusPageSettings?> GetByTenantAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default)
        {
            return await _context.TenantStatusPageSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.TenantId == tenantId && !x.IsDeleted, cancellationToken);
        }

        public async Task<TenantStatusPageSettings?> GetBySlugAsync(
            string slug,
            CancellationToken cancellationToken = default)
        {
            return await _context.TenantStatusPageSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Slug == slug && x.IsEnabled && !x.IsDeleted, cancellationToken);
        }

        public async Task AddAsync(TenantStatusPageSettings settings, CancellationToken cancellationToken = default)
        {
            _context.TenantStatusPageSettings.Add(settings);
            await _context.SaveChangesAsync(cancellationToken);
        }

        public async Task UpdateAsync(TenantStatusPageSettings settings, CancellationToken cancellationToken = default)
        {
            _context.TenantStatusPageSettings.Update(settings);
            await _context.SaveChangesAsync(cancellationToken);
        }

        public async Task SoftDeleteAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var entity = await _context.TenantStatusPageSettings
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
