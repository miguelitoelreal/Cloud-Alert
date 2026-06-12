using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Application.Services;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class DashboardController : ControllerBase
    {
        private readonly DashboardService _service;
        private readonly AppDbContext _dbContext;
        private readonly ICurrentUserContext _currentUser;

        public DashboardController(DashboardService service, AppDbContext dbContext, ICurrentUserContext currentUser)
        {
            _service = service;
            _dbContext = dbContext;
            _currentUser = currentUser;
        }

        [HttpGet("monitors")]
        public async Task<IActionResult> GetMonitors()
        {
            var result = await _service.GetMonitorSummariesAsync();
            return Ok(result);
        }

        [HttpGet("alerts-summary")]
        public async Task<IActionResult> GetAlertsSummary()
        {
            var offlineMonitors = await _dbContext.Monitors
                .AsNoTracking()
                .Where(m => m.TenantId == _currentUser.TenantId && m.Status == MonitoringPlatform.Domain.Entities.MonitorStatus.Offline)
                .Select(m => new { m.Id, m.Name })
                .ToListAsync();

            var systemTenant = await _dbContext.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Slug == "system-cloud-status");
            var systemTenantId = systemTenant?.Id ?? Guid.Empty;

            var activeCloudIncidents = await _dbContext.CloudIncidents
                .AsNoTracking()
                .Where(i => i.IsActive && (i.CloudProvider.TenantId == _currentUser.TenantId || (i.CloudProvider.TenantId == systemTenantId && i.CloudProvider.SourceType != MonitoringPlatform.Domain.Enums.CloudStatusSourceType.MicrosoftGraphServiceHealth)))
                .Select(i => new { i.Id, i.Title, ProviderName = i.CloudProvider.Name, i.Severity, i.OfficialUrl })
                .ToListAsync();

            var slaBreaches = await _dbContext.SlaReports
                .AsNoTracking()
                .Where(r => r.TenantId == _currentUser.TenantId && r.BreachCount > 0 && r.SlaDefinition != null && !r.SlaDefinition.IsDeleted)
                .CountAsync();

            Console.WriteLine($"[AlertsSummary] offlineMonitors={offlineMonitors.Count}, activeCloudIncidents={activeCloudIncidents.Count}, slaBreaches={slaBreaches}");

            // Create notifications for active alerts if they don't exist
            var totalAlerts = offlineMonitors.Count + activeCloudIncidents.Count + slaBreaches;
            if (totalAlerts > 0)
            {
                var existingNotificationCount = await _dbContext.UserNotifications
                    .Where(n => n.UserId == _currentUser.UserId && !n.IsRead)
                    .CountAsync();

                if (existingNotificationCount == 0)
                {
                    // Create a single notification for all alerts
                    var notification = new Domain.Entities.UserNotification
                    {
                        Id = Guid.NewGuid(),
                        UserId = _currentUser.UserId,
                        TenantId = _currentUser.TenantId,
                        NotificationType = "alerts_summary",
                        ResourceId = null,
                        ResourceTitle = $"{totalAlerts} alerta(s) activa(s)",
                        ResourceUrl = null,
                        IsRead = false,
                        CreatedAtUtc = DateTime.UtcNow,
                    };
                    _dbContext.UserNotifications.Add(notification);
                    await _dbContext.SaveChangesAsync();
                }
            }

            return Ok(new
            {
                offlineMonitors = offlineMonitors.Select(m => new { id = m.Id, name = m.Name }),
                activeCloudIncidents = activeCloudIncidents.Select(i => new { id = i.Id, title = i.Title, providerName = i.ProviderName, severity = i.Severity, officialUrl = i.OfficialUrl }),
                slaBreaches,
                total = offlineMonitors.Count() + activeCloudIncidents.Count() + slaBreaches,
            });
        }
    }
}
