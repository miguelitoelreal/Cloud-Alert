using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.Infrastructure.Repositories
{
    public class SlaReportRepository : ISlaReportRepository
    {
        private readonly AppDbContext _context;

        public SlaReportRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IReadOnlyList<SlaReport>> GetByDefinitionAsync(
            Guid slaDefinitionId,
            CancellationToken cancellationToken = default)
        {
            return await _context.SlaReports
                .AsNoTracking()
                .Where(x => x.SlaDefinitionId == slaDefinitionId)
                .OrderByDescending(x => x.PeriodEnd)
                .ToListAsync(cancellationToken);
        }

        public async Task<IReadOnlyList<SlaReport>> GetByTenantAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default)
        {
            return await _context.SlaReports
                .AsNoTracking()
                .Where(x => x.TenantId == tenantId)
                .Where(x => x.SlaDefinition != null && !x.SlaDefinition.IsDeleted)
                .OrderByDescending(x => x.PeriodEnd)
                .ToListAsync(cancellationToken);
        }

        public async Task AddAsync(SlaReport report, CancellationToken cancellationToken = default)
        {
            _context.SlaReports.Add(report);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
