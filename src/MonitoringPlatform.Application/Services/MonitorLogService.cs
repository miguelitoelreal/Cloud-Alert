using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;

namespace MonitoringPlatform.Application.Services
{
    public class MonitorLogService
    {
        private readonly IMonitorLogRepository _repository;

        public MonitorLogService(IMonitorLogRepository repository)
        {
            _repository = repository;
        }

        public Task<IReadOnlyList<MonitorLogResponseDto>> GetByMonitorIdAsync(Guid monitorId, int take = 100)
        {
            return _repository.GetByMonitorIdAsync(monitorId, take);
        }
    }
}
