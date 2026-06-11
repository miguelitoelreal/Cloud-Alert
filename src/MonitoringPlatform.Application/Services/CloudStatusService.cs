using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;

namespace MonitoringPlatform.Application.Services
{
    public class CloudStatusService
    {
        private readonly ICloudStatusRepository _repository;
        private readonly IDistributedCache _cache;

        public CloudStatusService(ICloudStatusRepository repository, IDistributedCache cache)
        {
            _repository = repository;
            _cache = cache;
        }

        public async Task<CloudStatusOverviewDto> GetOverviewAsync(CloudStatusQueryDto query)
        {
            query.Take = Math.Clamp(query.Take, 10, 200);
            var cacheKey = $"cs_overview_{query.Provider ?? "all"}_{query.Severity?.ToString() ?? "all"}_{query.ActiveOnly}_{query.Take}";
            var cached = await _cache.GetStringAsync(cacheKey);
            if (!string.IsNullOrWhiteSpace(cached))
            {
                return JsonSerializer.Deserialize<CloudStatusOverviewDto>(cached)!;
            }

            var result = await _repository.GetOverviewAsync(query);
            await _cache.SetStringAsync(
                cacheKey,
                JsonSerializer.Serialize(result),
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30),
                });
            return result;
        }

        public Task<List<CloudProviderTrendDto>> GetProviderTrendsAsync(DateTime startDate, CancellationToken cancellationToken = default)
        {
            return _repository.GetProviderTrendsAsync(startDate, cancellationToken);
        }
    }
}
