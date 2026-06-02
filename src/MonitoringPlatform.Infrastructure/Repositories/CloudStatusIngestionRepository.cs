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
        private readonly ICloudStatusEventPublisher _eventPublisher;

        public CloudStatusIngestionRepository(AppDbContext context, ICloudStatusEventPublisher eventPublisher)
        {
            _context = context;
            _eventPublisher = eventPublisher;
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

            // Disable providers that are no longer in configuration and resolve their active incidents
            var configuredSlugs = providers.Select(x => x.Slug).ToHashSet();
            var removedProviders = await _context.CloudProviders
                .Where(x => x.TenantId == tenantId && x.IsEnabled && !configuredSlugs.Contains(x.Slug))
                .ToListAsync(cancellationToken);

            foreach (var removed in removedProviders)
            {
                removed.IsEnabled = false;
                removed.UpdatedAt = now;

                var activeIncidents = await _context.CloudIncidents
                    .Where(x => x.CloudProviderId == removed.Id && x.IsActive)
                    .ToListAsync(cancellationToken);

                foreach (var inc in activeIncidents)
                {
                    inc.IsActive = false;
                    inc.Status = CloudIncidentStatus.Resolved;
                    var providerTime = inc.LastUpdatedAt != default ? inc.LastUpdatedAt : now;
                    inc.ResolvedAt = providerTime;
                    inc.LastUpdatedAt = providerTime;
                    inc.UpdatedAt = now;
                }
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
                    TenantId = x.TenantId,
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

            var insertedIds = new List<Guid>();
            var updatedIds = new List<Guid>();

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
                    insertedIds.Add(entity.Id);
                    continue;
                }

                if (ApplyIncident(entity, dto, syncedAtUtc))
                {
                    updatedIds.Add(entity.Id);
                }
            }

            foreach (var staleIncident in activeExistingNotReturned)
            {
                staleIncident.Status = CloudIncidentStatus.Resolved;
                staleIncident.IsActive = false;
                // Use the incident's own last-known provider time for resolution,
                // not the platform sync time, so the UI shows the real provider timeline.
                staleIncident.ResolvedAt = staleIncident.LastUpdatedAt;
                staleIncident.LastUpdatedAt = staleIncident.LastUpdatedAt;
                staleIncident.UpdatedAt = syncedAtUtc;
                updatedIds.Add(staleIncident.Id);
            }

            providerEntity.LastSyncedAt = syncedAtUtc;
            providerEntity.LastSyncError = null;
            providerEntity.UpdatedAt = syncedAtUtc;

            await _context.SaveChangesAsync(cancellationToken);

            if (insertedIds.Count > 0)
            {
                var insertedEntities = await _context.CloudIncidents
                    .AsNoTracking()
                    .Include(x => x.CloudProvider)
                    .Where(x => insertedIds.Contains(x.Id))
                    .ToListAsync(cancellationToken);
                foreach (var incident in insertedEntities)
                {
                    await _eventPublisher.PublishIncidentCreatedAsync(incident, cancellationToken);
                }
            }

            if (updatedIds.Count > 0)
            {
                var updatedEntities = await _context.CloudIncidents
                    .AsNoTracking()
                    .Include(x => x.CloudProvider)
                    .Where(x => updatedIds.Contains(x.Id))
                    .ToListAsync(cancellationToken);
                foreach (var incident in updatedEntities)
                {
                    if (incident.Status == CloudIncidentStatus.Resolved && incident.ResolvedAt.HasValue)
                    {
                        await _eventPublisher.PublishIncidentResolvedAsync(incident, cancellationToken);
                    }
                    else
                    {
                        await _eventPublisher.PublishIncidentUpdatedAsync(incident, CloudIncidentStatus.Unknown, cancellationToken);
                    }
                }
            }

            return new CloudStatusProviderIngestionResultDto
            {
                ProviderName = provider.Name,
                ProviderSlug = provider.Slug,
                Success = true,
                FetchedIncidents = incidents.Count,
                InsertedIncidents = insertedIds.Count,
                UpdatedIncidents = updatedIds.Count,
                InsertedIds = insertedIds,
                UpdatedIds = updatedIds,
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
