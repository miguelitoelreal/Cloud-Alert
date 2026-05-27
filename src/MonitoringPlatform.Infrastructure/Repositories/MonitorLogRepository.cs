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
    public class MonitorLogRepository : IMonitorLogRepository
    {
        private readonly AppDbContext _context;

        public MonitorLogRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IReadOnlyList<MonitorLogResponseDto>> GetByMonitorIdAsync(Guid monitorId, int take = 100)
        {
            if (take <= 0) take = 100;
            if (take > 500) take = 500;

            return await _context.MonitorLogs
                .AsNoTracking()
                .Where(l => l.MonitorId == monitorId)
                .OrderByDescending(l => l.CheckedAt)
                .Take(take)
                .Select(l => ToDto(l))
                .ToListAsync();
        }

        private static MonitorLogResponseDto ToDto(MonitorLog l) => new()
        {
            Id = l.Id,
            MonitorId = l.MonitorId,
            Status = (int)l.Status,
            StatusCode = l.StatusCode,
            ResponseTimeMs = l.ResponseTimeMs,
            CheckedAt = l.CheckedAt,
            ErrorMessage = l.ErrorMessage
        };
    }
}
