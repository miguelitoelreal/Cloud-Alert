using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.API.Services
{
    public class CloudImpactAssessmentService : ICloudImpactAssessmentService
    {
        private const int ProviderMatchScore = 40;
        private const int ServiceMatchScore = 30;
        private const int TemporalWindowMinutes = 120;

        private readonly AppDbContext _context;
        private readonly ICloudIncidentImpactRepository _impactRepository;

        public CloudImpactAssessmentService(
            AppDbContext context,
            ICloudIncidentImpactRepository impactRepository)
        {
            _context = context;
            _impactRepository = impactRepository;
        }

        public async Task<IReadOnlyList<CloudIncidentImpactDto>> AssessImpactAsync(
            Guid tenantId,
            Guid cloudIncidentId,
            CancellationToken cancellationToken = default)
        {
            var incident = await _context.CloudIncidents
                .AsNoTracking()
                .Include(i => i.CloudProvider)
                .FirstOrDefaultAsync(i => i.Id == cloudIncidentId, cancellationToken);

            if (incident is null)
            {
                return [];
            }

            var monitors = await _context.Monitors
                .AsNoTracking()
                .Where(m => m.TenantId == tenantId)
                .ToListAsync(cancellationToken);

            var impacts = new List<CloudIncidentImpact>();
            foreach (var monitor in monitors)
            {
                var (score, reason) = ComputeImpactScore(incident, monitor);
                if (score > 0)
                {
                    impacts.Add(new CloudIncidentImpact
                    {
                        Id = Guid.NewGuid(),
                        TenantId = tenantId,
                        CloudIncidentId = cloudIncidentId,
                        MonitorId = monitor.Id,
                        ImpactLevel = ScoreToLevel(score),
                        AffectedRegion = incident.Region,
                        AffectedService = DeriveAffectedService(incident, monitor),
                        Reason = reason,
                        CalculatedAt = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow,
                    });
                }
            }

            foreach (var impact in impacts)
            {
                await _impactRepository.AddAsync(impact, cancellationToken);
            }

            return impacts.Select(i => MapToDto(i)).ToList();
        }

        public async Task<IReadOnlyList<CloudIncidentImpactDto>> GetActiveImpactsAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default)
        {
            var impacts = await _impactRepository.GetActiveByTenantAsync(tenantId, cancellationToken);
            return impacts.Select(i => MapToDto(i)).ToList();
        }

        public async Task AssessImpactForRecentIncidentsAsync(
            CancellationToken cancellationToken = default)
        {
            var since = DateTime.UtcNow.AddMinutes(-TemporalWindowMinutes);
            var recentIncidents = await _context.CloudIncidents
                .AsNoTracking()
                .Where(i => (i.CreatedAt >= since || i.UpdatedAt >= since) && i.IsActive)
                .Include(i => i.CloudProvider)
                .ToListAsync(cancellationToken);

            if (recentIncidents.Count == 0)
            {
                return;
            }

            var tenants = await _context.Tenants
                .AsNoTracking()
                .ToListAsync(cancellationToken);

            foreach (var tenant in tenants)
            {
                var monitors = await _context.Monitors
                    .AsNoTracking()
                    .Where(m => m.TenantId == tenant.Id)
                    .ToListAsync(cancellationToken);

                foreach (var incident in recentIncidents)
                {
                    foreach (var monitor in monitors)
                    {
                        var (score, reason) = ComputeImpactScore(incident, monitor);
                        if (score > 0)
                        {
                            var impact = new CloudIncidentImpact
                            {
                                Id = Guid.NewGuid(),
                                TenantId = tenant.Id,
                                CloudIncidentId = incident.Id,
                                MonitorId = monitor.Id,
                                ImpactLevel = ScoreToLevel(score),
                                AffectedRegion = incident.Region,
                                AffectedService = DeriveAffectedService(incident, monitor),
                                Reason = reason,
                                CalculatedAt = DateTime.UtcNow,
                                CreatedAt = DateTime.UtcNow,
                            };
                            await _impactRepository.AddAsync(impact, cancellationToken);
                        }
                    }
                }
            }
        }

        private static (int Score, string Reason) ComputeImpactScore(CloudIncident incident, MonitoringPlatform.Domain.Entities.Monitor monitor)
        {
            var score = 0;
            var reasons = new List<string>();

            var provider = incident.CloudProvider;
            var providerName = provider?.Name ?? "";
            var providerSlug = provider?.Slug ?? "";
            var monitorUrl = monitor.Url.ToLowerInvariant();
            var monitorName = monitor.Name.ToLowerInvariant();

            if (!string.IsNullOrWhiteSpace(providerName)
                && (monitorUrl.Contains(providerName.ToLowerInvariant())
                    || monitorName.Contains(providerName.ToLowerInvariant())))
            {
                score += ProviderMatchScore;
                reasons.Add($"provider {providerName} detected in monitor");
            }
            else if (!string.IsNullOrWhiteSpace(providerSlug)
                     && (monitorUrl.Contains(providerSlug.ToLowerInvariant())
                         || monitorName.Contains(providerSlug.ToLowerInvariant())))
            {
                score += ProviderMatchScore;
                reasons.Add($"provider {providerSlug} detected in monitor");
            }

            var services = ParseServices(incident.AffectedServicesJson);
            foreach (var service in services)
            {
                if (monitorName.Contains(service.ToLowerInvariant()))
                {
                    score += ServiceMatchScore;
                    reasons.Add($"service '{service}' matches monitor");
                }
            }

            var reasonText = reasons.Count > 0 ? string.Join("; ", reasons) : "No direct match";
            return (score, reasonText);
        }

        private static ImpactLevel ScoreToLevel(int score)
        {
            return score switch
            {
                <= 0 => ImpactLevel.None,
                <= 30 => ImpactLevel.Low,
                <= 60 => ImpactLevel.Medium,
                <= 90 => ImpactLevel.High,
                _ => ImpactLevel.Critical,
            };
        }

        private static string? DeriveAffectedService(CloudIncident incident, MonitoringPlatform.Domain.Entities.Monitor monitor)
        {
            var services = ParseServices(incident.AffectedServicesJson);
            var monitorName = monitor.Name.ToLowerInvariant();
            return services.FirstOrDefault(s => monitorName.Contains(s.ToLowerInvariant()));
        }

        private static List<string> ParseServices(string? json)
        {
            if (string.IsNullOrWhiteSpace(json))
                return new List<string>();

            try
            {
                return System.Text.Json.JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
            }
            catch
            {
                return new List<string>();
            }
        }

        private static CloudIncidentImpactDto MapToDto(CloudIncidentImpact impact)
        {
            return new CloudIncidentImpactDto
            {
                Id = impact.Id,
                CloudIncidentId = impact.CloudIncidentId,
                IncidentTitle = impact.CloudIncident?.Title ?? "",
                MonitorId = impact.MonitorId,
                MonitorName = impact.Monitor?.Name ?? "",
                ImpactLevel = impact.ImpactLevel,
                AffectedRegion = impact.AffectedRegion,
                AffectedService = impact.AffectedService,
                Reason = impact.Reason,
                CalculatedAt = impact.CalculatedAt,
            };
        }
    }
}
