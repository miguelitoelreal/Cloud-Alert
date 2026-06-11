using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.Infrastructure.Repositories
{
    public class CloudIncidentImpactRepository : ICloudIncidentImpactRepository
    {
        private readonly AppDbContext _context;

        public CloudIncidentImpactRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IReadOnlyList<CloudIncidentImpact>> GetByIncidentIdAsync(
            Guid incidentId,
            CancellationToken cancellationToken = default)
        {
            return await _context.CloudIncidentImpacts
                .AsNoTracking()
                .Where(x => x.CloudIncidentId == incidentId)
                .Include(x => x.Monitor)
                .ToListAsync(cancellationToken);
        }

        public async Task<IReadOnlyList<CloudIncidentImpact>> GetActiveByTenantAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default)
        {
            return await _context.CloudIncidentImpacts
                .AsNoTracking()
                .Where(x => x.TenantId == tenantId)
                .Include(x => x.Monitor)
                .Include(x => x.CloudIncident)
                .OrderByDescending(x => x.CalculatedAt)
                .ToListAsync(cancellationToken);
        }

        public async Task AddAsync(CloudIncidentImpact impact, CancellationToken cancellationToken = default)
        {
            _context.CloudIncidentImpacts.Add(impact);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
