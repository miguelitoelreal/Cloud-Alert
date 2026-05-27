using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;

namespace MonitoringPlatform.Application.Services
{
    public class MonitoringExecutionService
    {
        private readonly IMonitorExecutionRepository _repository;

        public MonitoringExecutionService(IMonitorExecutionRepository repository)
        {
            _repository = repository;
        }

        public Task<IReadOnlyList<DueMonitorDto>> GetDueMonitorsAsync(
            DateTime nowUtc,
            IReadOnlyCollection<Guid> excludedMonitorIds,
            CancellationToken cancellationToken)
        {
            return _repository.GetDueMonitorsAsync(nowUtc, excludedMonitorIds, cancellationToken);
        }

        public Task<RecordedMonitorCheckDto> RecordCheckResultAsync(
            RecordMonitorCheckDto dto,
            CancellationToken cancellationToken)
        {
            return _repository.RecordCheckResultAsync(dto, cancellationToken);
        }
    }
}
