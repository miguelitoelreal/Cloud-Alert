using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.Infrastructure.Repositories
{
    public class DashboardRepository : IDashboardRepository
    {
        private readonly AppDbContext _context;
        private readonly ICurrentUserContext _currentUser;

        public DashboardRepository(AppDbContext context, ICurrentUserContext currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task<IReadOnlyList<DashboardMonitorSummaryDto>> GetMonitorSummariesAsync()
        {
            var monitors = await _context.Monitors
                .AsNoTracking()
                .Where(m => m.TenantId == _currentUser.TenantId)
                .OrderBy(m => m.Name)
                .Select(m => new
                {
                    m.Id,
                    m.Name,
                    m.Url,
                    Status = (int)m.Status,
                })
                .ToListAsync();

            if (monitors.Count == 0)
            {
                return [];
            }

            var monitorIds = monitors.Select(m => m.Id).ToArray();

            var aggregates = await _context.MonitorLogs
                .AsNoTracking()
                .Where(l => monitorIds.Contains(l.MonitorId))
                .GroupBy(l => l.MonitorId)
                .Select(g => new
                {
                    MonitorId = g.Key,
                    TotalChecks = g.Count(),
                    FailedChecks = g.Count(l => l.Status == MonitorStatus.Offline),
                })
                .ToDictionaryAsync(x => x.MonitorId, x => new
                {
                    x.TotalChecks,
                    x.FailedChecks,
                });

            var latestLogs = await _context.MonitorLogs
                .AsNoTracking()
                .Where(l => monitorIds.Contains(l.MonitorId))
                .GroupBy(l => l.MonitorId)
                .Select(g => g
                    .OrderByDescending(l => l.CheckedAt)
                    .ThenByDescending(l => l.Id)
                    .Select(l => new
                    {
                        l.MonitorId,
                        Status = (int)l.Status,
                        CheckedAt = (DateTime?)l.CheckedAt,
                        l.ResponseTimeMs,
                    })
                    .First())
                .ToDictionaryAsync(x => x.MonitorId, x => x);

            return monitors
                .Select(m =>
                {
                    var hasAggregate = aggregates.TryGetValue(m.Id, out var aggregate);
                    var hasLatestLog = latestLogs.TryGetValue(m.Id, out var latestLog);

                    var totalChecks = hasAggregate ? aggregate!.TotalChecks : 0;
                    var failedChecks = hasAggregate ? aggregate!.FailedChecks : 0;

                    return new DashboardMonitorSummaryDto
                    {
                        Id = m.Id,
                        Name = m.Name,
                        Url = m.Url,
                        CurrentStatus = hasLatestLog ? latestLog!.Status : m.Status,
                        LastCheckedAt = hasLatestLog ? latestLog!.CheckedAt : null,
                        LastResponseTimeMs = hasLatestLog ? latestLog!.ResponseTimeMs : null,
                        TotalChecks = totalChecks,
                        FailedChecks = failedChecks,
                        UptimePercentage = totalChecks > 0
                            ? ((double)(totalChecks - failedChecks) * 100.0) / totalChecks
                            : null,
                    };
                })
                .ToList();
        }
    }
}
