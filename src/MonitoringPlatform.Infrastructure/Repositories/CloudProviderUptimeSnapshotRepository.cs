using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.Infrastructure.Repositories
{
    public class CloudProviderUptimeSnapshotRepository : ICloudProviderUptimeSnapshotRepository
    {
        private readonly AppDbContext _context;

        public CloudProviderUptimeSnapshotRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IReadOnlyList<CloudProviderUptimeSnapshot>> GetByProviderAsync(
            Guid providerId,
            DateTime? from = null,
            DateTime? to = null,
            CancellationToken cancellationToken = default)
        {
            var query = _context.CloudProviderUptimeSnapshots
                .AsNoTracking()
                .Where(x => x.CloudProviderId == providerId);

            if (from.HasValue)
                query = query.Where(x => x.Date >= from.Value);

            if (to.HasValue)
                query = query.Where(x => x.Date <= to.Value);

            return await query
                .OrderBy(x => x.Date)
                .ToListAsync(cancellationToken);
        }

        public async Task AddAsync(CloudProviderUptimeSnapshot snapshot, CancellationToken cancellationToken = default)
        {
            _context.CloudProviderUptimeSnapshots.Add(snapshot);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
