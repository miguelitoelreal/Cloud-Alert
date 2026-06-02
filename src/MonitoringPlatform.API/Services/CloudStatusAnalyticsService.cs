using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Enums;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.API.Services
{
    public class CloudStatusAnalyticsService : ICloudStatusAnalyticsService
    {
        private readonly AppDbContext _context;

        public CloudStatusAnalyticsService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IReadOnlyList<CloudProviderAnalyticsDto>> GetProviderAnalyticsAsync(
            Guid tenantId,
            CloudStatusAnalyticsRequestDto request,
            CancellationToken cancellationToken = default)
        {
            var from = request.From ?? DateTime.UtcNow.AddDays(-30);
            var to = request.To ?? DateTime.UtcNow;

            var systemTenant = await _context.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Slug == "system-cloud-status", cancellationToken);
            var systemTenantId = systemTenant?.Id ?? Guid.Empty;

            var providers = await _context.CloudProviders
                .AsNoTracking()
                .Where(p => p.IsEnabled && (p.TenantId == tenantId || (p.TenantId == systemTenantId && p.SourceType != CloudStatusSourceType.MicrosoftGraphServiceHealth)))
                .ToListAsync(cancellationToken);

            var providerIds = providers.Select(p => p.Id).ToList();

            var incidents = await _context.CloudIncidents
                .AsNoTracking()
                .Where(i => providerIds.Contains(i.CloudProviderId)
                            && i.OccurredAt >= from
                            && i.OccurredAt <= to)
                .ToListAsync(cancellationToken);

            var snapshots = await _context.CloudProviderUptimeSnapshots
                .AsNoTracking()
                .Where(s => providerIds.Contains(s.CloudProviderId)
                            && s.Date >= from
                            && s.Date <= to)
                .ToListAsync(cancellationToken);

            var result = new List<CloudProviderAnalyticsDto>();
            foreach (var provider in providers)
            {
                var providerIncidents = incidents.Where(i => i.CloudProviderId == provider.Id).ToList();
                var providerSnapshots = snapshots.Where(s => s.CloudProviderId == provider.Id).ToList();

                var analytics = BuildAnalytics(provider, providerIncidents, providerSnapshots, from, to);
                result.Add(analytics);
            }

            return result;
        }

        public async Task<CloudProviderAnalyticsDto?> GetProviderAnalyticsAsync(
            Guid tenantId,
            string providerSlug,
            CloudStatusAnalyticsRequestDto request,
            CancellationToken cancellationToken = default)
        {
            var systemTenant2 = await _context.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Slug == "system-cloud-status", cancellationToken);
            var systemTenantId2 = systemTenant2?.Id ?? Guid.Empty;

            var provider = await _context.CloudProviders
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Slug == providerSlug && p.IsEnabled && (p.TenantId == tenantId || (p.TenantId == systemTenantId2 && p.SourceType != CloudStatusSourceType.MicrosoftGraphServiceHealth)), cancellationToken);

            if (provider is null)
            {
                return null;
            }

            var from = request.From ?? DateTime.UtcNow.AddDays(-30);
            var to = request.To ?? DateTime.UtcNow;

            var incidents = await _context.CloudIncidents
                .AsNoTracking()
                .Where(i => i.CloudProviderId == provider.Id
                            && i.OccurredAt >= from
                            && i.OccurredAt <= to)
                .ToListAsync(cancellationToken);

            var snapshots = await _context.CloudProviderUptimeSnapshots
                .AsNoTracking()
                .Where(s => s.CloudProviderId == provider.Id
                            && s.Date >= from
                            && s.Date <= to)
                .ToListAsync(cancellationToken);

            return BuildAnalytics(provider, incidents, snapshots, from, to);
        }

        private static CloudProviderAnalyticsDto BuildAnalytics(
            Domain.Entities.CloudProvider provider,
            List<Domain.Entities.CloudIncident> incidents,
            List<Domain.Entities.CloudProviderUptimeSnapshot> snapshots,
            DateTime from,
            DateTime to)
        {
            var totalWindowMinutes = (to - from).TotalMinutes;
            totalWindowMinutes = Math.Max(totalWindowMinutes, 1);

            var resolved = incidents.Where(i => i.ResolvedAt.HasValue).ToList();
            var active = incidents.Where(i => !i.ResolvedAt.HasValue).ToList();

            var downtimeMinutes = resolved.Sum(i => (i.ResolvedAt!.Value - i.OccurredAt).TotalMinutes)
                                  + active.Sum(i => (DateTime.UtcNow - i.OccurredAt).TotalMinutes);
            downtimeMinutes = Math.Min(downtimeMinutes, totalWindowMinutes);

            var uptimePercent = totalWindowMinutes > 0
                ? (decimal)((totalWindowMinutes - downtimeMinutes) / totalWindowMinutes * 100)
                : 100m;

            var mttrMinutes = resolved.Count > 0
                ? (int)resolved.Average(i => (i.ResolvedAt!.Value - i.OccurredAt).TotalMinutes)
                : 0;

            var severityDistribution = incidents
                .GroupBy(i => i.Severity)
                .Select(g => new CloudIncidentSeverityCountDto
                {
                    Severity = g.Key,
                    Count = g.Count(),
                })
                .ToList();

            var trends = incidents
                .GroupBy(i => i.OccurredAt.Date)
                .OrderBy(g => g.Key)
                .Select(g => new CloudIncidentTrendDto
                {
                    Date = g.Key,
                    ActiveIncidents = g.Count(i => !i.ResolvedAt.HasValue || (i.ResolvedAt.Value > to)),
                    ResolvedIncidents = g.Count(i => i.ResolvedAt.HasValue && i.ResolvedAt.Value <= to),
                })
                .ToList();

            return new CloudProviderAnalyticsDto
            {
                ProviderId = provider.Id,
                ProviderName = provider.Name,
                ProviderSlug = provider.Slug,
                UptimePercent = uptimePercent,
                IncidentCount = incidents.Count,
                AvgMttrMinutes = mttrMinutes,
                DowntimeMinutes = (int)downtimeMinutes,
                SeverityDistribution = severityDistribution,
                Trends = trends,
            };
        }
    }
}
