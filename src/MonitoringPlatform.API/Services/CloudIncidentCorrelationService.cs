using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.API.Services
{
    public class CloudIncidentCorrelationService : ICloudIncidentCorrelationService
    {
        private const int CorrelationThreshold = 40;
        private const int TemporalWindowMinutes = 120;
        private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase)
        {
            "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
            "have", "has", "had", "do", "does", "did", "will", "would", "could",
            "should", "may", "might", "must", "shall", "can", "need", "dare",
            "ought", "used", "to", "of", "in", "for", "on", "with", "at", "by",
            "from", "as", "into", "through", "during", "before", "after", "above",
            "below", "between", "under", "and", "but", "or", "yet", "so", "if",
            "because", "although", "though", "while", "where", "when", "that",
            "which", "who", "whom", "whose", "what", "this", "these", "those",
            "de", "la", "el", "en", "y", "a", "los", "del", "se", "las", "por",
            "un", "para", "con", "no", "una", "su", "al", "lo", "mas", "o",
            "pero", "sus", "le", "ya", "o", "este", "si", "porque", "esta",
        };

        private readonly AppDbContext _context;
        private readonly ICloudIncidentGroupRepository _groupRepository;

        public CloudIncidentCorrelationService(
            AppDbContext context,
            ICloudIncidentGroupRepository groupRepository)
        {
            _context = context;
            _groupRepository = groupRepository;
        }

        public async Task<IReadOnlyList<CloudIncidentGroupDto>> DetectAndGroupAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default)
        {
            var since = DateTime.UtcNow.AddDays(-7);
            var activeIncidents = await _context.CloudIncidents
                .AsNoTracking()
                .Where(i => i.IsActive && i.OccurredAt >= since)
                .Include(i => i.CloudProvider)
                .ToListAsync(cancellationToken);

            if (activeIncidents.Count < 2)
            {
                return [];
            }

            var correlations = BuildCorrelations(activeIncidents);
            var groups = FormGroups(correlations);
            await SaveGroupsAsync(tenantId, groups, activeIncidents, cancellationToken);

            return await GetActiveGroupsAsync(tenantId, cancellationToken);
        }

        public async Task<IReadOnlyList<CloudIncidentGroupDto>> GetActiveGroupsAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default)
        {
            var groups = await _groupRepository.GetActiveGroupsAsync(tenantId, cancellationToken);
            return groups.Select(g => new CloudIncidentGroupDto
            {
                Id = g.Id,
                Title = g.Title,
                RootCause = g.RootCause,
                DetectedAt = g.DetectedAt,
                Correlations = g.Correlations.Select(c => new CloudIncidentCorrelationDto
                {
                    Id = c.Id,
                    CloudIncidentId = c.CloudIncidentId,
                    IncidentTitle = c.CloudIncident?.Title ?? "",
                    ProviderName = c.CloudIncident?.CloudProvider?.Name ?? "",
                    CorrelationScore = c.CorrelationScore,
                    CorrelationReason = c.CorrelationReason,
                }).ToList(),
            }).ToList();
        }

        public async Task DetectForRecentIncidentsAsync(
            CancellationToken cancellationToken = default)
        {
            var since = DateTime.UtcNow.AddMinutes(-TemporalWindowMinutes);
            var recentIncidents = await _context.CloudIncidents
                .AsNoTracking()
                .Where(i => i.CreatedAt >= since || i.UpdatedAt >= since)
                .Include(i => i.CloudProvider)
                .ToListAsync(cancellationToken);

            if (recentIncidents.Count == 0)
            {
                return;
            }

            var activeIncidents = await _context.CloudIncidents
                .AsNoTracking()
                .Where(i => i.IsActive && i.OccurredAt >= DateTime.UtcNow.AddDays(-7))
                .Include(i => i.CloudProvider)
                .ToListAsync(cancellationToken);

            var correlations = BuildCorrelations(activeIncidents, recentIncidents);
            var groups = FormGroups(correlations);
            await SaveGroupsAsync(Guid.Empty, groups, activeIncidents, cancellationToken);
        }

        private static List<(CloudIncident A, CloudIncident B, int Score, string Reason)> BuildCorrelations(
            List<CloudIncident> incidents,
            List<CloudIncident>? recentOnly = null)
        {
            var targets = recentOnly ?? incidents;
            var result = new List<(CloudIncident, CloudIncident, int, string)>();

            for (var i = 0; i < targets.Count; i++)
            {
                for (var j = 0; j < incidents.Count; j++)
                {
                    var a = targets[i];
                    var b = incidents[j];
                    if (a.Id == b.Id) continue;

                    var score = ComputeCorrelationScore(a, b);
                    if (score >= CorrelationThreshold)
                    {
                        var reason = BuildReason(a, b, score);
                        result.Add((a, b, score, reason));
                    }
                }
            }

            return result;
        }

        private static int ComputeCorrelationScore(CloudIncident a, CloudIncident b)
        {
            var score = 0;

            if (!string.IsNullOrWhiteSpace(a.Region)
                && !string.IsNullOrWhiteSpace(b.Region)
                && a.Region.Equals(b.Region, StringComparison.OrdinalIgnoreCase))
            {
                score += 25;
            }

            var servicesA = ParseServices(a.AffectedServicesJson);
            var servicesB = ParseServices(b.AffectedServicesJson);
            var sharedServices = servicesA.Intersect(servicesB, StringComparer.OrdinalIgnoreCase).Count();
            score += sharedServices * 20;

            var wordsA = ExtractKeywords(a.Title);
            var wordsB = ExtractKeywords(b.Title);
            var sharedWords = wordsA.Intersect(wordsB, StringComparer.OrdinalIgnoreCase).Count();
            score += sharedWords * 10;

            var timeDiff = Math.Abs((a.OccurredAt - b.OccurredAt).TotalMinutes);
            if (timeDiff <= TemporalWindowMinutes)
            {
                score += 15;
            }

            return score;
        }

        private static string BuildReason(CloudIncident a, CloudIncident b, int score)
        {
            var parts = new List<string>();
            if (!string.IsNullOrWhiteSpace(a.Region)
                && a.Region.Equals(b.Region, StringComparison.OrdinalIgnoreCase))
            {
                parts.Add($"region {a.Region}");
            }

            var servicesA = ParseServices(a.AffectedServicesJson);
            var servicesB = ParseServices(b.AffectedServicesJson);
            var sharedServices = servicesA.Intersect(servicesB, StringComparer.OrdinalIgnoreCase).ToList();
            if (sharedServices.Count > 0)
            {
                parts.Add($"services {string.Join(", ", sharedServices)}");
            }

            var wordsA = ExtractKeywords(a.Title);
            var wordsB = ExtractKeywords(b.Title);
            var sharedWords = wordsA.Intersect(wordsB, StringComparer.OrdinalIgnoreCase).ToList();
            if (sharedWords.Count > 0)
            {
                parts.Add($"keywords {string.Join(", ", sharedWords)}");
            }

            var timeDiff = Math.Abs((a.OccurredAt - b.OccurredAt).TotalMinutes);
            if (timeDiff <= TemporalWindowMinutes)
            {
                parts.Add($"temporal window {timeDiff:F0} min");
            }

            return $"Score {score}: {string.Join("; ", parts)}";
        }

        private static List<string> FormGroups(
            List<(CloudIncident A, CloudIncident B, int Score, string Reason)> correlations)
        {
            var groups = new List<List<Guid>>();
            var incidentToGroup = new Dictionary<Guid, int>();

            foreach (var (a, b, score, reason) in correlations)
            {
                if (incidentToGroup.TryGetValue(a.Id, out var groupA)
                    && incidentToGroup.TryGetValue(b.Id, out var groupB))
                {
                    if (groupA != groupB)
                    {
                        var smaller = groups[groupB].Count < groups[groupA].Count ? groupB : groupA;
                        var larger = smaller == groupA ? groupB : groupA;
                        foreach (var id in groups[smaller])
                        {
                            incidentToGroup[id] = larger;
                        }
                        groups[larger].AddRange(groups[smaller]);
                        groups[smaller].Clear();
                    }
                }
                else if (incidentToGroup.TryGetValue(a.Id, out var existingGroup))
                {
                    groups[existingGroup].Add(b.Id);
                    incidentToGroup[b.Id] = existingGroup;
                }
                else if (incidentToGroup.TryGetValue(b.Id, out var existingGroupB))
                {
                    groups[existingGroupB].Add(a.Id);
                    incidentToGroup[a.Id] = existingGroupB;
                }
                else
                {
                    var newGroup = new List<Guid> { a.Id, b.Id };
                    var index = groups.Count;
                    groups.Add(newGroup);
                    incidentToGroup[a.Id] = index;
                    incidentToGroup[b.Id] = index;
                }
            }

            return groups
                .Where(g => g.Count >= 2)
                .Select(g => string.Join(",", g.Distinct().OrderBy(x => x)))
                .Distinct()
                .ToList();
        }

        private async Task SaveGroupsAsync(
            Guid tenantId,
            List<string> groupKeys,
            List<CloudIncident> allIncidents,
            CancellationToken cancellationToken)
        {
            foreach (var key in groupKeys)
            {
                var incidentIds = key.Split(',').Select(Guid.Parse).ToList();
                var incidents = allIncidents.Where(i => incidentIds.Contains(i.Id)).ToList();
                if (incidents.Count < 2) continue;

                var title = "Possible correlation: " + string.Join(", ", incidents.Select(i => i.CloudProvider?.Name).Distinct());
                var group = new CloudIncidentGroup
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId == Guid.Empty ? (incidents.FirstOrDefault()?.CloudProvider?.TenantId ?? Guid.Empty) : tenantId,
                    Title = title,
                    RootCause = $"{incidents.Count} incidents detected in temporal window",
                    DetectedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                };

                await _groupRepository.AddAsync(group, cancellationToken);

                foreach (var incident in incidents)
                {
                    var correlation = new CloudIncidentCorrelation
                    {
                        Id = Guid.NewGuid(),
                        GroupId = group.Id,
                        CloudIncidentId = incident.Id,
                        CorrelationScore = 50,
                        CorrelationReason = "Automatic correlation by region, services or keywords",
                        CreatedAt = DateTime.UtcNow,
                    };
                    _context.CloudIncidentCorrelations.Add(correlation);
                }

                await _context.SaveChangesAsync(cancellationToken);
            }
        }

        private static HashSet<string> ExtractKeywords(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            return new HashSet<string>(
                text.Split(new[] { ' ', '.', ',', ';', ':', '!', '?', '-', '_', '(', ')' }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(w => w.Trim().ToLowerInvariant())
                    .Where(w => w.Length > 2 && !StopWords.Contains(w)),
                StringComparer.OrdinalIgnoreCase);
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
    }
}
