using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Infrastructure.CloudStatus;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.API.Services
{
    public class CloudProviderDetailService : ICloudProviderDetailService
    {
        private readonly AppDbContext _context;

        public CloudProviderDetailService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<CloudProviderDetailDto?> GetProviderDetailAsync(
            Guid tenantId,
            string providerSlug,
            CancellationToken cancellationToken = default)
        {
            var provider = await _context.CloudProviders
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x => x.Slug == providerSlug && x.IsEnabled,
                    cancellationToken);

            if (provider is null)
            {
                return null;
            }

            var recentIncidents = await _context.CloudIncidents
                .AsNoTracking()
                .Where(x => x.CloudProviderId == provider.Id)
                .OrderByDescending(x => x.OccurredAt)
                .Take(20)
                .Select(x => new CloudIncidentDto
                {
                    Id = x.Id,
                    ProviderId = x.CloudProviderId,
                    ProviderName = provider.Name,
                    ProviderSlug = provider.Slug,
                    ProviderLogoUrl = provider.LogoUrl,
                    Title = x.Title,
                    Description = x.Description,
                    Severity = x.Severity,
                    Status = x.Status,
                    Region = x.Region,
                    AffectedServices = CloudStatusParsingHelpers.DeserializeServices(x.AffectedServicesJson),
                    Source = x.Source,
                    OfficialUrl = x.OfficialUrl,
                    IsActive = x.IsActive,
                    OccurredAt = x.OccurredAt,
                    LastUpdatedAt = x.LastUpdatedAt,
                    ResolvedAt = x.ResolvedAt,
                    DisplayStatus = CloudStatusParsingHelpers.DetermineDisplayStatus(x.Status, x.Severity, x.IsActive),
                })
                .ToListAsync(cancellationToken);

            var recentEvents = await _context.CloudIncidentEvents
                .AsNoTracking()
                .Where(x => recentIncidents.Select(i => i.Id).Contains(x.CloudIncidentId))
                .OrderByDescending(x => x.OccurredAt)
                .Take(50)
                .Select(x => new CloudIncidentEventDto
                {
                    Id = x.Id,
                    CloudIncidentId = x.CloudIncidentId,
                    PreviousStatus = x.PreviousStatus,
                    NewStatus = x.NewStatus,
                    PreviousSeverity = x.PreviousSeverity,
                    NewSeverity = x.NewSeverity,
                    EventDescription = x.EventDescription,
                    OccurredAt = x.OccurredAt,
                })
                .ToListAsync(cancellationToken);

            var affectedServices = recentIncidents
                .SelectMany(x => x.AffectedServices)
                .Distinct()
                .ToList();

            var affectedRegions = recentIncidents
                .Select(x => x.Region)
                .OfType<string>()
                .Distinct()
                .ToList();

            var snapshot = await _context.CloudProviderUptimeSnapshots
                .AsNoTracking()
                .Where(x => x.CloudProviderId == provider.Id)
                .OrderByDescending(x => x.Date)
                .FirstOrDefaultAsync(cancellationToken);

            var analytics = new CloudProviderAnalyticsDto
            {
                ProviderId = provider.Id,
                ProviderName = provider.Name,
                ProviderSlug = provider.Slug,
                UptimePercent = snapshot?.UptimePercent ?? 100m,
                IncidentCount = recentIncidents.Count(),
                AvgMttrMinutes = snapshot?.AvgMttrMinutes ?? 0,
                DowntimeMinutes = snapshot?.DowntimeMinutes ?? 0,
                SeverityDistribution = recentIncidents
                    .GroupBy(x => x.Severity)
                    .Select(g => new CloudIncidentSeverityCountDto
                    {
                        Severity = g.Key,
                        Count = g.Count(),
                    })
                    .ToList(),
                Trends = [],
            };

            return new CloudProviderDetailDto
            {
                Provider = new CloudProviderDto
                {
                    Id = provider.Id,
                    Name = provider.Name,
                    Slug = provider.Slug,
                    LogoUrl = provider.LogoUrl,
                    SourceType = provider.SourceType,
                    StatusPageUrl = provider.StatusPageUrl,
                    IsEnabled = provider.IsEnabled,
                    LastSyncedAt = provider.LastSyncedAt,
                    LastSyncError = provider.LastSyncError,
                    ActiveIncidents = recentIncidents.Count(i => i.IsActive),
                },
                RecentIncidents = recentIncidents,
                RecentEvents = recentEvents,
                Analytics = analytics,
                AffectedRegions = affectedRegions,
                AffectedServices = affectedServices,
            };
        }
    }
}
