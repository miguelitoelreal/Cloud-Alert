using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.Infrastructure.Repositories
{
    public class CloudIncidentEventRepository : ICloudIncidentEventRepository
    {
        private readonly AppDbContext _context;

        public CloudIncidentEventRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IReadOnlyList<CloudIncidentEvent>> GetByIncidentIdAsync(
            Guid incidentId,
            CancellationToken cancellationToken = default)
        {
            return await _context.CloudIncidentEvents
                .AsNoTracking()
                .Where(x => x.CloudIncidentId == incidentId)
                .OrderByDescending(x => x.OccurredAt)
                .ToListAsync(cancellationToken);
        }

        public async Task AddAsync(CloudIncidentEvent evt, CancellationToken cancellationToken = default)
        {
            _context.CloudIncidentEvents.Add(evt);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
