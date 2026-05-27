using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Infrastructure.CloudStatus;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.Infrastructure.Repositories
{
    public class CloudStatusRepository : ICloudStatusRepository
    {
        private readonly AppDbContext _context;
        private readonly ICurrentUserContext _currentUser;

        public CloudStatusRepository(AppDbContext context, ICurrentUserContext currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task<CloudStatusOverviewDto> GetOverviewAsync(CloudStatusQueryDto query)
        {
            var providerBaseQuery = _context.CloudProviders
                .AsNoTracking()
                .Where(x => x.IsEnabled);

            if (!string.IsNullOrWhiteSpace(query.Provider))
            {
                providerBaseQuery = providerBaseQuery.Where(x => x.Slug == query.Provider);
            }

            var providers = await providerBaseQuery
                .OrderBy(x => x.Name)
                .Select(x => new CloudProviderDto
                {
                    Id = x.Id,
                    Name = x.Name,
                    Slug = x.Slug,
                    LogoUrl = x.LogoUrl,
                    SourceType = x.SourceType,
                    StatusPageUrl = x.StatusPageUrl,
                    IsEnabled = x.IsEnabled,
                    LastSyncedAt = x.LastSyncedAt,
                    LastSyncError = x.LastSyncError,
                    ActiveIncidents = x.Incidents.Count(i => i.IsActive),
                })
                .ToListAsync();

            var providerIds = providers.Select(x => x.Id).ToArray();
            if (providerIds.Length == 0)
            {
                return new CloudStatusOverviewDto
                {
                    Providers = providers,
                    Incidents = [],
                    Summary = new CloudStatusSummaryDto
                    {
                        TotalProviders = 0,
                        ActiveIncidents = 0,
                        CriticalOutages = 0,
                        OperationalServices = 0,
                        LastUpdatedAt = null,
                    },
                };
            }

            var activeIncidentMetrics = await _context.CloudIncidents
                .AsNoTracking()
                .Where(x => providerIds.Contains(x.CloudProviderId) && x.IsActive)
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    ActiveIncidents = g.Count(),
                    CriticalOutages = g.Count(x => x.Severity == Domain.Enums.CloudIncidentSeverity.Critical),
                    AffectedProviders = g.Select(x => x.CloudProviderId).Distinct().Count(),
                    LastUpdatedAt = g.Max(x => (DateTime?)x.LastUpdatedAt),
                })
                .FirstOrDefaultAsync();

            var incidentBaseQuery = _context.CloudIncidents
                .AsNoTracking()
                .Where(x => providerIds.Contains(x.CloudProviderId));

            if (query.Severity.HasValue)
            {
                incidentBaseQuery = incidentBaseQuery.Where(x => (int)x.Severity == query.Severity.Value);
            }

            if (query.ActiveOnly)
            {
                incidentBaseQuery = incidentBaseQuery.Where(x => x.IsActive);
            }

            var incidentRows = await incidentBaseQuery
                .OrderByDescending(x => x.IsActive)
                .ThenByDescending(x => x.LastUpdatedAt)
                .ThenByDescending(x => x.OccurredAt)
                .Take(query.Take)
                .Select(x => new
                {
                    x.Id,
                    x.CloudProviderId,
                    ProviderName = x.CloudProvider.Name,
                    ProviderSlug = x.CloudProvider.Slug,
                    ProviderLogoUrl = x.CloudProvider.LogoUrl,
                    x.Title,
                    x.Description,
                    x.Severity,
                    x.Status,
                    x.Region,
                    x.AffectedServicesJson,
                    x.Source,
                    x.OfficialUrl,
                    x.IsActive,
                    x.OccurredAt,
                    x.LastUpdatedAt,
                    x.ResolvedAt,
                })
                .ToListAsync();

            var incidents = incidentRows.Select(x => new CloudIncidentDto
            {
                Id = x.Id,
                ProviderId = x.CloudProviderId,
                ProviderName = x.ProviderName,
                ProviderSlug = x.ProviderSlug,
                ProviderLogoUrl = x.ProviderLogoUrl,
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
            }).ToArray();

            return new CloudStatusOverviewDto
            {
                Providers = providers,
                Incidents = incidents,
                Summary = new CloudStatusSummaryDto
                {
                    TotalProviders = providers.Count,
                    ActiveIncidents = activeIncidentMetrics?.ActiveIncidents ?? 0,
                    CriticalOutages = activeIncidentMetrics?.CriticalOutages ?? 0,
                    OperationalServices = providers.Count - (activeIncidentMetrics?.AffectedProviders ?? 0),
                    LastUpdatedAt = activeIncidentMetrics?.LastUpdatedAt ?? providers.Max(x => x.LastSyncedAt),
                },
            };
        }
    }
}
