using System.Collections.Generic;
using System.Threading.Tasks;
using MonitoringPlatform.Application.DTOs;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface IDashboardRepository
    {
        Task<IReadOnlyList<DashboardMonitorSummaryDto>> GetMonitorSummariesAsync();
    }
}
