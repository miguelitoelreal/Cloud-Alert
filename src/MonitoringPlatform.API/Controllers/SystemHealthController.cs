using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Enums;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.API.Controllers
{
    [ApiController]
    [Route("api/system")]
    [Authorize(Roles = "Admin")]
    public class SystemHealthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ICurrentUserContext _currentUser;
        private readonly ILogger<SystemHealthController> _logger;
        private static readonly DateTime _startupAt = DateTime.UtcNow;

        public SystemHealthController(
            AppDbContext context,
            ICurrentUserContext currentUser,
            ILogger<SystemHealthController> logger)
        {
            _context = context;
            _currentUser = currentUser;
            _logger = logger;
        }

        [HttpGet("health")]
        public async Task<IActionResult> GetHealth(CancellationToken cancellationToken)
        {
            var lastIngestion = await _context.CloudProviderUptimeSnapshots
                .AsNoTracking()
                .OrderByDescending(x => x.Date)
                .Select(x => (DateTime?)x.Date)
                .FirstOrDefaultAsync(cancellationToken);

            var failedProviders = await _context.CloudProviders
                .AsNoTracking()
                .Where(x => x.TenantId == _currentUser.TenantId && x.IsEnabled && x.LastSyncError != null)
                .Select(x => new { x.Name, x.LastSyncError })
                .ToListAsync(cancellationToken);

            var totalMonitors = await _context.Monitors
                .AsNoTracking()
                .CountAsync(x => x.TenantId == _currentUser.TenantId, cancellationToken);

            var systemTenant = await _context.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Slug == "system-cloud-status", cancellationToken);
            var systemTenantId = systemTenant?.Id ?? Guid.Empty;

            var activeIncidents = await _context.CloudIncidents
                .AsNoTracking()
                .CountAsync(x => x.IsActive && (x.CloudProvider.TenantId == _currentUser.TenantId || (x.CloudProvider.TenantId == systemTenantId && x.CloudProvider.SourceType != MonitoringPlatform.Domain.Enums.CloudStatusSourceType.MicrosoftGraphServiceHealth)), cancellationToken);

            var recentAlerts = await _context.AlertHistories
                .AsNoTracking()
                .Where(x => x.TenantId == _currentUser.TenantId && x.SentAt > DateTime.UtcNow.AddDays(-1))
                .CountAsync(cancellationToken);

            var recentSyncEvents = await _context.CloudStatusEventLogs
                .AsNoTracking()
                .Where(x => x.TenantId == _currentUser.TenantId && x.EventType == Domain.Entities.CloudStatusEventType.ProviderSyncFailed && x.OccurredAt > DateTime.UtcNow.AddDays(-1))
                .OrderByDescending(x => x.OccurredAt)
                .Take(5)
                .Select(x => new { x.PayloadJson, x.OccurredAt })
                .ToListAsync(cancellationToken);

            var tenantUsers = await _context.Users
                .AsNoTracking()
                .CountAsync(x => x.TenantId == _currentUser.TenantId, cancellationToken);

            return Ok(new
            {
                signalRState = "connected",
                lastCloudIngestionAt = lastIngestion,
                failedProviders = failedProviders.Select(x => x.Name).ToList(),
                failedProviderDetails = failedProviders.Select(x => new { x.Name, x.LastSyncError }).ToList(),
                activeWorkers = 2,
                uptimeMinutes = (int)(DateTime.UtcNow - _startupAt).TotalMinutes,
                totalMonitors,
                activeIncidents,
                recentAlerts,
                recentErrors = recentSyncEvents.Select(x => new { Message = x.PayloadJson ?? "Sync failed", Timestamp = x.OccurredAt }).ToList(),
                tenantUsers,
            });
        }
    }
}
