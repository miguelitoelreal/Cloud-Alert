using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.Infrastructure.Repositories
{
    public class ServiceDependencyRepository : IServiceDependencyRepository
    {
        private readonly AppDbContext _context;
        private readonly ICurrentUserContext _currentUser;

        public ServiceDependencyRepository(AppDbContext context, ICurrentUserContext currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task<IReadOnlyList<ServiceDependency>> GetByTenantAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default)
        {
            return await _context.ServiceDependencies
                .AsNoTracking()
                .Where(x => x.TenantId == tenantId && !x.IsDeleted)
                .Include(x => x.SourceMonitor)
                .Include(x => x.TargetMonitor)
                .ToListAsync(cancellationToken);
        }

        public async Task<IReadOnlyList<ServiceDependency>> GetBySourceMonitorAsync(
            Guid monitorId,
            CancellationToken cancellationToken = default)
        {
            return await _context.ServiceDependencies
                .AsNoTracking()
                .Where(x => x.TenantId == _currentUser.TenantId && x.SourceMonitorId == monitorId && !x.IsDeleted)
                .Include(x => x.TargetMonitor)
                .ToListAsync(cancellationToken);
        }

        public async Task<IReadOnlyList<ServiceDependency>> GetByTargetMonitorAsync(
            Guid monitorId,
            CancellationToken cancellationToken = default)
        {
            return await _context.ServiceDependencies
                .AsNoTracking()
                .Where(x => x.TenantId == _currentUser.TenantId && x.TargetMonitorId == monitorId && !x.IsDeleted)
                .Include(x => x.SourceMonitor)
                .ToListAsync(cancellationToken);
        }

        public async Task AddAsync(ServiceDependency dependency, CancellationToken cancellationToken = default)
        {
            _context.ServiceDependencies.Add(dependency);
            await _context.SaveChangesAsync(cancellationToken);
        }

        public async Task SoftDeleteAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var entity = await _context.ServiceDependencies
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
