using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using MonitoringPlatform.Application.DTOs;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface IMonitorRepository
    {
        Task<MonitorResponseDto?> GetByIdAsync(Guid id);
        Task<IEnumerable<MonitorResponseDto>> GetAllAsync();
        Task<MonitorResponseDto> CreateAsync(CreateMonitorDto dto);
        Task<MonitorResponseDto?> UpdateAsync(Guid id, UpdateMonitorDto dto);
        Task<bool> DeleteAsync(Guid id);
    }
}
