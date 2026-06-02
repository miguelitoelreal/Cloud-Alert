using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.Infrastructure.Repositories
{
    public class CloudIncidentGroupRepository : ICloudIncidentGroupRepository
    {
        private readonly AppDbContext _context;
        private readonly ICurrentUserContext _currentUser;

        public CloudIncidentGroupRepository(AppDbContext context, ICurrentUserContext currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task<IReadOnlyList<CloudIncidentGroup>> GetActiveGroupsAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default)
        {
            return await _context.CloudIncidentGroups
                .AsNoTracking()
                .Where(x => x.TenantId == tenantId)
                .Include(x => x.Correlations)
                .ThenInclude(c => c.CloudIncident)
                .OrderByDescending(x => x.DetectedAt)
                .ToListAsync(cancellationToken);
        }

        public async Task<CloudIncidentGroup?> GetByIdAsync(
            Guid id,
            CancellationToken cancellationToken = default)
        {
            return await _context.CloudIncidentGroups
                .AsNoTracking()
                .Where(x => x.TenantId == _currentUser.TenantId)
                .Include(x => x.Correlations)
                .ThenInclude(c => c.CloudIncident)
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        }

        public async Task AddAsync(CloudIncidentGroup group, CancellationToken cancellationToken = default)
        {
            _context.CloudIncidentGroups.Add(group);
            await _context.SaveChangesAsync(cancellationToken);
        }

        public async Task UpdateAsync(CloudIncidentGroup group, CancellationToken cancellationToken = default)
        {
            _context.CloudIncidentGroups.Update(group);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
