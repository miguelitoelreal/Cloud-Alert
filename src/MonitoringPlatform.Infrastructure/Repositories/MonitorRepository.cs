using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;
using DomainMonitor = MonitoringPlatform.Domain.Entities.Monitor;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.Infrastructure.Repositories
{
    public class MonitorRepository : IMonitorRepository
    {
        private readonly AppDbContext _context;
        private readonly ICurrentUserContext _currentUser;

        public MonitorRepository(AppDbContext context, ICurrentUserContext currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task<MonitorResponseDto?> GetByIdAsync(Guid id)
        {
            var monitor = await _context.Monitors
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id && x.TenantId == _currentUser.TenantId);
            return monitor == null ? null : ToDto(monitor);
        }

        public async Task<IEnumerable<MonitorResponseDto>> GetAllAsync()
        {
            return await _context.Monitors
                .AsNoTracking()
                .Where(m => m.TenantId == _currentUser.TenantId)
                .Select(m => ToDto(m))
                .ToListAsync();
        }

        public async Task<MonitorResponseDto> CreateAsync(CreateMonitorDto dto)
        {
            var monitor = new DomainMonitor
            {
                Id = Guid.NewGuid(),
                TenantId = _currentUser.TenantId,
                Name = dto.Name,
                Url = dto.Url,
                IntervalInSeconds = dto.IntervalInSeconds,
                Status = MonitorStatus.Unknown,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Monitors.Add(monitor);
            await _context.SaveChangesAsync();
            return ToDto(monitor);
        }

        public async Task<MonitorResponseDto?> UpdateAsync(Guid id, UpdateMonitorDto dto)
        {
            var monitor = await _context.Monitors
                .FirstOrDefaultAsync(x => x.Id == id && x.TenantId == _currentUser.TenantId);
            if (monitor == null) return null;
            monitor.Name = dto.Name;
            monitor.Url = dto.Url;
            monitor.IntervalInSeconds = dto.IntervalInSeconds;
            monitor.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return ToDto(monitor);
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var monitor = await _context.Monitors
                .FirstOrDefaultAsync(x => x.Id == id && x.TenantId == _currentUser.TenantId);
            if (monitor == null) return false;
            await _context.MonitorLogs
                .Where(l => l.MonitorId == id)
                .ExecuteDeleteAsync();
            _context.Monitors.Remove(monitor);
            await _context.SaveChangesAsync();
            return true;
        }

        private static MonitorResponseDto ToDto(DomainMonitor m) => new()
        {
            Id = m.Id,
            Name = m.Name,
            Url = m.Url,
            IntervalInSeconds = m.IntervalInSeconds,
            Status = (int)m.Status,
            CreatedAt = m.CreatedAt,
            UpdatedAt = m.UpdatedAt
        };
    }
}
