using System.Collections.Generic;
using System.Threading.Tasks;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;

namespace MonitoringPlatform.Application.Services
{
    public class DashboardService
    {
        private readonly IDashboardRepository _repository;

        public DashboardService(IDashboardRepository repository)
        {
            _repository = repository;
        }

        public Task<IReadOnlyList<DashboardMonitorSummaryDto>> GetMonitorSummariesAsync()
        {
            return _repository.GetMonitorSummariesAsync();
        }
    }
}
