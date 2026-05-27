using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Domain.Enums;
using MonitoringPlatform.Infrastructure.CloudStatus;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.Infrastructure.Repositories
{
    public class CloudStatusIngestionRepository : ICloudStatusIngestionRepository
    {
        private const string SystemTenantSlug = "system-cloud-status";
        private const string SystemTenantName = "System Cloud Status";

        private readonly AppDbContext _context;

        public CloudStatusIngestionRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task SyncProvidersAsync(IReadOnlyCollection<CloudProviderSeedDto> providers, CancellationToken cancellationToken)
        {
            if (providers.Count == 0)
            {
                return;
            }

            var now = DateTime.UtcNow;
            var tenantId = await GetOrCreateSystemTenantIdAsync(now, cancellationToken);
            var slugs = providers.Select(x => x.Slug).ToArray();
            var existingProviders = await _context.CloudProviders
                .Where(x => x.TenantId == tenantId && slugs.Contains(x.Slug))
                .ToDictionaryAsync(x => x.Slug, cancellationToken);

            foreach (var seed in providers)
            {
                if (existingProviders.TryGetValue(seed.Slug, out var existing))
                {
                    existing.Name = seed.Name;
                    existing.LogoUrl = seed.LogoUrl;
                    existing.SourceType = seed.SourceType;
                    existing.SourceUrl = seed.SourceUrl;
                    existing.StatusPageUrl = seed.StatusPageUrl;
                    existing.MetadataJson = seed.MetadataJson;
                    existing.IsEnabled = seed.IsEnabled;
                    existing.UpdatedAt = now;
                    continue;
                }

                _context.CloudProviders.Add(new CloudProvider
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    Name = seed.Name,
                    Slug = seed.Slug,
                    LogoUrl = seed.LogoUrl,
                    SourceType = seed.SourceType,
                    SourceUrl = seed.SourceUrl,
                    StatusPageUrl = seed.StatusPageUrl,
                    MetadataJson = seed.MetadataJson,
                    IsEnabled = seed.IsEnabled,
                    CreatedAt = now,
                    UpdatedAt = now,
                });
            }

            await _context.SaveChangesAsync(cancellationToken);
        }

        public async Task<IReadOnlyList<CloudProviderIngestionTargetDto>> GetEnabledProvidersAsync(CancellationToken cancellationToken)
        {
            return await _context.CloudProviders
                .AsNoTracking()
                .Where(x => x.IsEnabled)
                .OrderBy(x => x.Name)
                .Select(x => new CloudProviderIngestionTargetDto
                {
                    Id = x.Id,
                    Name = x.Name,
                    Slug = x.Slug,
                    LogoUrl = x.LogoUrl,
                    SourceType = x.SourceType,
                    SourceUrl = x.SourceUrl,
                    StatusPageUrl = x.StatusPageUrl,
                    MetadataJson = x.MetadataJson,
                    IsEnabled = x.IsEnabled,
                })
                .ToListAsync(cancellationToken);
        }

        private async Task<Guid> GetOrCreateSystemTenantIdAsync(DateTime now, CancellationToken cancellationToken)
        {
            var tenant = await _context.Tenants.FirstOrDefaultAsync(x => x.Slug == SystemTenantSlug, cancellationToken);
            if (tenant is not null)
            {
                return tenant.Id;
            }

            tenant = new Tenant
            {
                Id = Guid.NewGuid(),
                Name = SystemTenantName,
                Slug = SystemTenantSlug,
                CreatedAtUtc = now,
            };

            _context.Tenants.Add(tenant);
            await _context.SaveChangesAsync(cancellationToken);
            return tenant.Id;
        }

        public async Task<CloudStatusProviderIngestionResultDto> UpsertIncidentsAsync(
            CloudProviderIngestionTargetDto provider,
            IReadOnlyCollection<CloudIncidentIngestionDto> incidents,
            DateTime syncedAtUtc,
            CancellationToken cancellationToken)
        {
            var providerEntity = await _context.CloudProviders.FirstAsync(x => x.Id == provider.Id, cancellationToken);
            var externalIds = incidents.Select(x => x.ExternalId).ToArray();

            var existingIncidents = await _context.CloudIncidents
                .Where(x => x.CloudProviderId == provider.Id && externalIds.Contains(x.ExternalId))
                .ToDictionaryAsync(x => x.ExternalId, cancellationToken);

            var activeExistingNotReturned = await _context.CloudIncidents
                .Where(x => x.CloudProviderId == provider.Id && x.IsActive && !externalIds.Contains(x.ExternalId))
                .ToListAsync(cancellationToken);

            var inserted = 0;
            var updated = 0;

            foreach (var dto in incidents)
            {
                if (!existingIncidents.TryGetValue(dto.ExternalId, out var entity))
                {
                    entity = new CloudIncident
                    {
                        Id = Guid.NewGuid(),
                        CloudProviderId = provider.Id,
                        ExternalId = dto.ExternalId,
                        CreatedAt = syncedAtUtc,
                    };

                    ApplyIncident(entity, dto, syncedAtUtc);
                    _context.CloudIncidents.Add(entity);
                    inserted++;
                    continue;
                }

                if (ApplyIncident(entity, dto, syncedAtUtc))
                {
                    updated++;
                }
            }

            foreach (var staleIncident in activeExistingNotReturned)
            {
                staleIncident.Status = CloudIncidentStatus.Resolved;
                staleIncident.IsActive = false;
                staleIncident.ResolvedAt = syncedAtUtc;
                staleIncident.LastUpdatedAt = syncedAtUtc;
                staleIncident.UpdatedAt = syncedAtUtc;
                updated++;
            }

            providerEntity.LastSyncedAt = syncedAtUtc;
            providerEntity.LastSyncError = null;
            providerEntity.UpdatedAt = syncedAtUtc;

            await _context.SaveChangesAsync(cancellationToken);

            return new CloudStatusProviderIngestionResultDto
            {
                ProviderName = provider.Name,
                ProviderSlug = provider.Slug,
                Success = true,
                FetchedIncidents = incidents.Count,
                InsertedIncidents = inserted,
                UpdatedIncidents = updated,
            };
        }

        public async Task<CloudStatusProviderIngestionResultDto> MarkSyncFailureAsync(
            CloudProviderIngestionTargetDto provider,
            DateTime syncedAtUtc,
            string error,
            CancellationToken cancellationToken)
        {
            var providerEntity = await _context.CloudProviders.FirstAsync(x => x.Id == provider.Id, cancellationToken);
            providerEntity.LastSyncedAt = syncedAtUtc;
            providerEntity.LastSyncError = error;
            providerEntity.UpdatedAt = syncedAtUtc;
            await _context.SaveChangesAsync(cancellationToken);

            return new CloudStatusProviderIngestionResultDto
            {
                ProviderName = provider.Name,
                ProviderSlug = provider.Slug,
                Success = false,
                FetchedIncidents = 0,
                InsertedIncidents = 0,
                UpdatedIncidents = 0,
                Error = error,
            };
        }

        private static bool ApplyIncident(CloudIncident entity, CloudIncidentIngestionDto dto, DateTime syncedAtUtc)
        {
            var affectedServicesJson = CloudStatusParsingHelpers.SerializeServices(dto.AffectedServices);
            var isActive = dto.Status != CloudIncidentStatus.Resolved;
            var changed =
                entity.Title != dto.Title ||
                entity.Description != dto.Description ||
                entity.Severity != dto.Severity ||
                entity.Status != dto.Status ||
                entity.Region != dto.Region ||
                entity.AffectedServicesJson != affectedServicesJson ||
                entity.Source != dto.Source ||
                entity.OfficialUrl != dto.OfficialUrl ||
                entity.IsActive != isActive ||
                entity.OccurredAt != dto.OccurredAt ||
                entity.LastUpdatedAt != dto.LastUpdatedAt ||
                entity.ResolvedAt != dto.ResolvedAt;

            entity.Title = dto.Title;
            entity.Description = dto.Description;
            entity.Severity = dto.Severity;
            entity.Status = dto.Status;
            entity.Region = dto.Region;
            entity.AffectedServicesJson = affectedServicesJson;
            entity.Source = dto.Source;
            entity.OfficialUrl = dto.OfficialUrl;
            entity.IsActive = isActive;
            entity.OccurredAt = dto.OccurredAt;
            entity.LastUpdatedAt = dto.LastUpdatedAt;
            entity.ResolvedAt = dto.ResolvedAt;
            entity.UpdatedAt = syncedAtUtc;

            return changed;
        }
    }
}
