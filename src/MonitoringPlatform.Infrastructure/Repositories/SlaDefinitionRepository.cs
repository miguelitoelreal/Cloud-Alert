using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.Infrastructure.Repositories
{
    public class SlaDefinitionRepository : ISlaDefinitionRepository
    {
        private readonly AppDbContext _context;
        private readonly ICurrentUserContext _currentUser;

        public SlaDefinitionRepository(AppDbContext context, ICurrentUserContext currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task<IReadOnlyList<SlaDefinition>> GetByTenantAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default)
        {
            return await _context.SlaDefinitions
                .AsNoTracking()
                .Where(x => x.TenantId == tenantId && !x.IsDeleted)
                .ToListAsync(cancellationToken);
        }

        public async Task<SlaDefinition?> GetByIdAsync(
            Guid id,
            CancellationToken cancellationToken = default)
        {
            return await _context.SlaDefinitions
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id && x.TenantId == _currentUser.TenantId && !x.IsDeleted, cancellationToken);
        }

        public async Task AddAsync(SlaDefinition definition, CancellationToken cancellationToken = default)
        {
            _context.SlaDefinitions.Add(definition);
            await _context.SaveChangesAsync(cancellationToken);
        }

        public async Task UpdateAsync(SlaDefinition definition, CancellationToken cancellationToken = default)
        {
            _context.SlaDefinitions.Update(definition);
            await _context.SaveChangesAsync(cancellationToken);
        }

        public async Task SoftDeleteAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var entity = await _context.SlaDefinitions
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
