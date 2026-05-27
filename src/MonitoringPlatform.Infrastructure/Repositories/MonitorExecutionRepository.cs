using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.Infrastructure.Repositories
{
    public class MonitorExecutionRepository : IMonitorExecutionRepository
    {
        private readonly AppDbContext _context;

        public MonitorExecutionRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IReadOnlyList<DueMonitorDto>> GetDueMonitorsAsync(
            DateTime nowUtc,
            IReadOnlyCollection<Guid> excludedMonitorIds,
            CancellationToken cancellationToken)
        {
            var monitorsQuery = _context.Monitors
                .AsNoTracking()
                .Select(m => new DueMonitorDto
                {
                    Id = m.Id,
                    TenantId = m.TenantId,
                    Name = m.Name,
                    Url = m.Url,
                    IntervalInSeconds = m.IntervalInSeconds,
                });

            if (excludedMonitorIds.Count > 0)
            {
                monitorsQuery = monitorsQuery.Where(m => !excludedMonitorIds.Contains(m.Id));
            }

            var monitors = await monitorsQuery.ToListAsync(cancellationToken);
            if (monitors.Count == 0)
            {
                return monitors;
            }

            var monitorIds = monitors.Select(m => m.Id).ToArray();

            var latestChecks = await _context.MonitorLogs
                .AsNoTracking()
                .Where(l => monitorIds.Contains(l.MonitorId))
                .GroupBy(l => l.MonitorId)
                .Select(g => new
                {
                    MonitorId = g.Key,
                    LastCheckedAt = g.Max(l => l.CheckedAt),
                })
                .ToDictionaryAsync(x => x.MonitorId, x => x.LastCheckedAt, cancellationToken);

            return monitors
                .Where(m => !latestChecks.TryGetValue(m.Id, out var lastCheckedAt)
                    || (nowUtc - lastCheckedAt).TotalSeconds >= m.IntervalInSeconds)
                .OrderBy(m => m.Name)
                .ToList();
        }

        public async Task<RecordedMonitorCheckDto> RecordCheckResultAsync(
            RecordMonitorCheckDto dto,
            CancellationToken cancellationToken)
        {
            var monitor = await _context.Monitors.FindAsync(new object[] { dto.MonitorId }, cancellationToken);
            if (monitor == null)
            {
                throw new KeyNotFoundException($"Monitor '{dto.MonitorId}' was not found.");
            }

            var log = new MonitorLog
            {
                Id = Guid.NewGuid(),
                MonitorId = dto.MonitorId,
                Status = (MonitorStatus)dto.Status,
                StatusCode = dto.StatusCode,
                ResponseTimeMs = dto.ResponseTimeMs,
                CheckedAt = dto.CheckedAt,
                ErrorMessage = dto.ErrorMessage,
            };

            _context.MonitorLogs.Add(log);

            monitor.Status = (MonitorStatus)dto.Status;
            monitor.UpdatedAt = dto.CheckedAt;

            await _context.SaveChangesAsync(cancellationToken);

            var aggregates = await _context.MonitorLogs
                .AsNoTracking()
                .Where(l => l.MonitorId == dto.MonitorId)
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    TotalChecks = g.Count(),
                    FailedChecks = g.Count(l => l.Status == MonitorStatus.Offline),
                })
                .FirstAsync(cancellationToken);

            return new RecordedMonitorCheckDto
            {
                Monitor = new DashboardMonitorSummaryDto
                {
                    Id = monitor.Id,
                    Name = monitor.Name,
                    Url = monitor.Url,
                    CurrentStatus = dto.Status,
                    LastCheckedAt = dto.CheckedAt,
                    LastResponseTimeMs = dto.ResponseTimeMs,
                    TotalChecks = aggregates.TotalChecks,
                    FailedChecks = aggregates.FailedChecks,
                    UptimePercentage = aggregates.TotalChecks > 0
                        ? ((double)(aggregates.TotalChecks - aggregates.FailedChecks) * 100.0) / aggregates.TotalChecks
                        : null,
                },
                Log = new MonitorLogDto
                {
                    Id = log.Id,
                    MonitorId = log.MonitorId,
                    Status = dto.Status,
                    StatusCode = dto.StatusCode,
                    ResponseTimeMs = dto.ResponseTimeMs,
                    CheckedAt = dto.CheckedAt,
                    ErrorMessage = dto.ErrorMessage,
                },
            };
        }
    }
}
