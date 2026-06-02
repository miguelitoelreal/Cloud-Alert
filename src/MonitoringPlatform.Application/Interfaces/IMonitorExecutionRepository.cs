using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MonitoringPlatform.Application.DTOs;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface IMonitorExecutionRepository
    {
        Task<IReadOnlyList<DueMonitorDto>> GetDueMonitorsAsync(
            DateTime nowUtc,
            IReadOnlyCollection<Guid> excludedMonitorIds,
            CancellationToken cancellationToken);

        Task<RecordedMonitorCheckDto> RecordCheckResultAsync(
            RecordMonitorCheckDto dto,
            CancellationToken cancellationToken);
    }
}
