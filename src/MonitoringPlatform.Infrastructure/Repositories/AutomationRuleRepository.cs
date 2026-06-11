using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.Infrastructure.Repositories
{
    public class AutomationRuleRepository : IAutomationRuleRepository
    {
        private readonly AppDbContext _context;
        private readonly ICurrentUserContext _currentUser;

        public AutomationRuleRepository(AppDbContext context, ICurrentUserContext currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task<IReadOnlyList<AutomationRule>> GetByTenantAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default)
        {
            return await _context.AutomationRules
                .AsNoTracking()
                .Where(x => x.TenantId == tenantId && !x.IsDeleted)
                .ToListAsync(cancellationToken);
        }

        public async Task<AutomationRule?> GetByIdAsync(
            Guid id,
            CancellationToken cancellationToken = default)
        {
            return await _context.AutomationRules
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id && x.TenantId == _currentUser.TenantId && !x.IsDeleted, cancellationToken);
        }

        public async Task AddAsync(AutomationRule rule, CancellationToken cancellationToken = default)
        {
            _context.AutomationRules.Add(rule);
            await _context.SaveChangesAsync(cancellationToken);
        }

        public async Task UpdateAsync(AutomationRule rule, CancellationToken cancellationToken = default)
        {
            _context.AutomationRules.Update(rule);
            await _context.SaveChangesAsync(cancellationToken);
        }

        public async Task SoftDeleteAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var entity = await _context.AutomationRules
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
