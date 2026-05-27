using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;

namespace MonitoringPlatform.Application.Services
{
    public class CloudStatusService
    {
        private readonly ICloudStatusRepository _repository;

        public CloudStatusService(ICloudStatusRepository repository)
        {
            _repository = repository;
        }

        public Task<CloudStatusOverviewDto> GetOverviewAsync(CloudStatusQueryDto query)
        {
            query.Take = Math.Clamp(query.Take, 10, 200);
            return _repository.GetOverviewAsync(query);
        }
    }
}
