using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using MonitoringPlatform.Application.DTOs;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface IMonitorLogRepository
    {
        Task<IReadOnlyList<MonitorLogResponseDto>> GetByMonitorIdAsync(Guid monitorId, int take = 100);
    }
}
