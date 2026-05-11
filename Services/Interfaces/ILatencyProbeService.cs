using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CloudAlertApp.Models;

namespace CloudAlertApp.Services.Interfaces
{
    public interface ILatencyProbeService
    {
        Task<LatencyProbeResponse> ProbeAsync(LatencyProbeRequest request, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<LatencyMeasurement>> GetHistoryAsync(string serviceName, int limit = 20, CancellationToken cancellationToken = default);
    }
}
