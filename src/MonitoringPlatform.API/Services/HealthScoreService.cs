using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Domain.Enums;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.API.Services
{
    public class HealthScoreService : IHealthScoreService
    {
        private readonly AppDbContext _context;

        public HealthScoreService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<decimal> CalculateTenantScoreAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default)
        {
            var monitors = await _context.Monitors
                .AsNoTracking()
                .Where(m => m.TenantId == tenantId)
                .ToListAsync(cancellationToken);

            if (monitors.Count == 0)
            {
                return 100m;
            }

            var monitorIds = monitors.Select(m => m.Id).ToList();

            var onlineCount = monitors.Count(m => m.Status == MonitorStatus.Online);
            var uptimeScore = (decimal)onlineCount / monitors.Count * 100;

            var criticalCloudCount = await _context.CloudIncidents
                .AsNoTracking()
                .CountAsync(i => i.IsActive && i.Severity == CloudIncidentSeverity.Critical, cancellationToken);
            var cloudScore = Math.Max(0m, 100m - criticalCloudCount * 10m);

            var mttrScore = await CalculateMttrScoreAsync(monitorIds, cancellationToken);
            var certificateScore = 100m;
            var latencyScore = await CalculateLatencyScoreAsync(monitorIds, cancellationToken);
            var offlineCount = monitors.Count(m => m.Status == MonitorStatus.Offline);
            var offlineScore = Math.Max(0m, 100m - offlineCount * 10m);

            var score =
                (uptimeScore * 0.30m) +
                (cloudScore * 0.20m) +
                (mttrScore * 0.15m) +
                (certificateScore * 0.15m) +
                (latencyScore * 0.10m) +
                (offlineScore * 0.10m);

            return Math.Round(Math.Clamp(score, 0m, 100m), 2);
        }

        private async Task<decimal> CalculateMttrScoreAsync(
            List<Guid> monitorIds,
            CancellationToken cancellationToken)
        {
            var since = DateTime.UtcNow.AddDays(-7);
            var logs = await _context.MonitorLogs
                .AsNoTracking()
                .Where(l => monitorIds.Contains(l.MonitorId) && l.CheckedAt >= since)
                .OrderBy(l => l.CheckedAt)
                .ToListAsync(cancellationToken);

            if (logs.Count == 0)
            {
                return 100m;
            }

            var downtimePeriods = new List<TimeSpan>();
            var inDowntime = false;
            var downtimeStart = DateTime.MinValue;

            foreach (var log in logs)
            {
                if (log.Status == MonitorStatus.Offline)
                {
                    if (!inDowntime)
                    {
                        inDowntime = true;
                        downtimeStart = log.CheckedAt;
                    }
                }
                else
                {
                    if (inDowntime)
                    {
                        downtimePeriods.Add(log.CheckedAt - downtimeStart);
                        inDowntime = false;
                    }
                }
            }

            if (downtimePeriods.Count == 0)
            {
                return 100m;
            }

            var avgMttrMinutes = downtimePeriods.Average(d => d.TotalMinutes);
            var score = Math.Max(0m, 100m - (decimal)(avgMttrMinutes / 3.6));
            return score;
        }

        private async Task<decimal> CalculateLatencyScoreAsync(
            List<Guid> monitorIds,
            CancellationToken cancellationToken)
        {
            var since = DateTime.UtcNow.AddDays(-1);
            var recentLogs = await _context.MonitorLogs
                .AsNoTracking()
                .Where(l => monitorIds.Contains(l.MonitorId) && l.CheckedAt >= since)
                .ToListAsync(cancellationToken);

            if (recentLogs.Count == 0)
            {
                return 100m;
            }

            var avgLatency = recentLogs.Average(l => l.ResponseTimeMs).GetValueOrDefault();
            if (avgLatency == 0)
            {
                return 100m;
            }

            var score = Math.Max(0m, 100m - (decimal)(avgLatency / 10));
            return score;
        }
    }
}
