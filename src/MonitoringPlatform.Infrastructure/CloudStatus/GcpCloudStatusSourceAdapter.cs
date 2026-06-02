using System.Net.Http;
using System.Text.Json;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Enums;

namespace MonitoringPlatform.Infrastructure.CloudStatus
{
    public class GcpCloudStatusSourceAdapter : ICloudStatusSourceAdapter
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public GcpCloudStatusSourceAdapter(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        public bool CanHandle(CloudStatusSourceType sourceType) => sourceType == CloudStatusSourceType.GcpStatusApi;

        public async Task<IReadOnlyList<CloudIncidentIngestionDto>> GetIncidentsAsync(
            CloudProviderIngestionTargetDto provider,
            CancellationToken cancellationToken)
        {
            var client = _httpClientFactory.CreateClient("CloudStatusHttpClient");
            using var response = await client.GetAsync(provider.SourceUrl, cancellationToken);
            response.EnsureSuccessStatusCode();

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

            // GCP returns either { incidents: [...] } or a direct array
            JsonElement incidentsElement;
            if (document.RootElement.ValueKind == JsonValueKind.Array)
            {
                incidentsElement = document.RootElement;
            }
            else if (document.RootElement.TryGetProperty("incidents", out var prop) && prop.ValueKind == JsonValueKind.Array)
            {
                incidentsElement = prop;
            }
            else
            {
                return [];
            }

            var result = new List<CloudIncidentIngestionDto>();
            foreach (var incident in incidentsElement.EnumerateArray())
            {
                var incidentId = incident.TryGetProperty("id", out var idElement) ? idElement.GetString() : null;
                if (string.IsNullOrWhiteSpace(incidentId))
                {
                    incidentId = incident.TryGetProperty("number", out var numElement) && numElement.ValueKind == JsonValueKind.Number
                        ? numElement.GetInt32().ToString()
                        : null;
                }

                var externalDesc = incident.TryGetProperty("external_desc", out var descElement) ? descElement.GetString() : null;
                var mostRecentUpdate = GetMostRecentUpdate(incident);
                var title = mostRecentUpdate?.Text ?? externalDesc ?? "Google Cloud incident";
                if (string.IsNullOrWhiteSpace(title))
                {
                    continue;
                }

                var description = CloudStatusParsingHelpers.ComposeDescription(mostRecentUpdate?.Text, externalDesc);
                var severity = incident.TryGetProperty("severity", out var sevElement) ? sevElement.GetString() : null;
                var statusImpact = incident.TryGetProperty("status_impact", out var impactElement) ? impactElement.GetString() : null;
                var serviceName = incident.TryGetProperty("service_name", out var svcElement) ? svcElement.GetString() : null;

                var affectedServices = CloudStatusParsingHelpers.NormalizeAffectedServices(
                    new[] { serviceName, provider.Name }.Where(x => !string.IsNullOrWhiteSpace(x)));

                var occurredAt = CloudStatusParsingHelpers.ParseDateTime(
                    incident.TryGetProperty("begin", out var beginElement) ? beginElement.GetString() : null,
                    DateTime.UtcNow);

                var lastUpdatedAt = CloudStatusParsingHelpers.ParseDateTime(
                    mostRecentUpdate?.When
                    ?? (incident.TryGetProperty("modified", out var modElement) ? modElement.GetString() : null)
                    ?? (incident.TryGetProperty("created", out var createdElement) ? createdElement.GetString() : null),
                    occurredAt);

                var resolvedAt = CloudStatusParsingHelpers.ParseNullableDateTime(
                    incident.TryGetProperty("end", out var endElement) ? endElement.GetString() : null);

                var isResolved = resolvedAt.HasValue || string.Equals(statusImpact, "RESOLVED", StringComparison.OrdinalIgnoreCase);

                var region = InferGcpRegion(incident) ?? CloudStatusParsingHelpers.InferRegion(title, description, affectedServices, provider.StatusPageUrl);

                var officialUrl = !string.IsNullOrWhiteSpace(provider.StatusPageUrl)
                    ? $"{provider.StatusPageUrl.TrimEnd('/')}/incident/{incidentId}"
                    : provider.SourceUrl;

                result.Add(new CloudIncidentIngestionDto
                {
                    ExternalId = incidentId ?? title.GetHashCode().ToString(),
                    Title = title.Trim(),
                    Description = description,
                    Severity = MapGcpSeverity(severity, statusImpact),
                    Status = isResolved ? CloudIncidentStatus.Resolved : MapGcpStatus(statusImpact),
                    Region = region,
                    AffectedServices = affectedServices,
                    Source = "Google Cloud Status",
                    OfficialUrl = officialUrl,
                    OccurredAt = occurredAt,
                    LastUpdatedAt = lastUpdatedAt,
                    ResolvedAt = resolvedAt,
                });
            }

            return result;
        }

        private static CloudIncidentSeverity MapGcpSeverity(string? severity, string? statusImpact)
        {
            var normalized = string.Join(" ", new[] { severity, statusImpact }
                .Where(x => !string.IsNullOrWhiteSpace(x)))
                .Trim()
                .ToLowerInvariant();

            if (normalized.Contains("high") || normalized.Contains("critical") || normalized.Contains("disruption"))
            {
                return CloudIncidentSeverity.Critical;
            }

            if (normalized.Contains("medium") || normalized.Contains("major") || normalized.Contains("degradation"))
            {
                return CloudIncidentSeverity.Major;
            }

            if (normalized.Contains("low") || normalized.Contains("minor"))
            {
                return CloudIncidentSeverity.Minor;
            }

            return CloudIncidentSeverity.Unknown;
        }

        private static CloudIncidentStatus MapGcpStatus(string? statusImpact)
        {
            return statusImpact?.Trim().ToLowerInvariant() switch
            {
                "service_disruption" => CloudIncidentStatus.Investigating,
                "service_degradation" => CloudIncidentStatus.Monitoring,
                "performance_degradation" => CloudIncidentStatus.Monitoring,
                "planned_maintenance" => CloudIncidentStatus.Maintenance,
                "resolved" => CloudIncidentStatus.Resolved,
                _ => CloudIncidentStatus.Unknown,
            };
        }

        private static string? InferGcpRegion(JsonElement incident)
        {
            if (incident.TryGetProperty("affected_locations", out var locationsElement) && locationsElement.ValueKind == JsonValueKind.Array)
            {
                var regions = new List<string>();
                foreach (var loc in locationsElement.EnumerateArray())
                {
                    var locationName = loc.TryGetProperty("location", out var locName) ? locName.GetString() : null;
                    var locationId = loc.TryGetProperty("id", out var locId) ? locId.GetString() : null;
                    var region = !string.IsNullOrWhiteSpace(locationName) ? locationName : locationId;
                    if (!string.IsNullOrWhiteSpace(region))
                    {
                        regions.Add(region);
                    }
                }

                if (regions.Count > 0)
                {
                    return string.Join(", ", regions.Distinct().Take(5));
                }
            }

            return null;
        }

        private static UpdateInfo? GetMostRecentUpdate(JsonElement incident)
        {
            // Try the dedicated most_recent_update field first
            if (incident.TryGetProperty("most_recent_update", out var mruElement) && mruElement.ValueKind == JsonValueKind.Object)
            {
                return new UpdateInfo(
                    mruElement.TryGetProperty("text", out var textEl) ? textEl.GetString() : null,
                    mruElement.TryGetProperty("when", out var whenEl) ? whenEl.GetString() : null,
                    mruElement.TryGetProperty("status", out var statusEl) ? statusEl.GetString() : null);
            }

            // Fall back to scanning the updates array
            if (!incident.TryGetProperty("updates", out var updatesElement) || updatesElement.ValueKind != JsonValueKind.Array)
            {
                return null;
            }

            UpdateInfo? latest = null;
            DateTime latestTime = DateTime.MinValue;

            foreach (var update in updatesElement.EnumerateArray())
            {
                var when = CloudStatusParsingHelpers.ParseDateTime(
                    update.TryGetProperty("when", out var whenEl) ? whenEl.GetString() : null,
                    DateTime.MinValue);

                if (latest is null || when >= latestTime)
                {
                    latest = new UpdateInfo(
                        update.TryGetProperty("text", out var textEl) ? textEl.GetString() : null,
                        update.TryGetProperty("when", out var whenEl2) ? whenEl2.GetString() : null,
                        update.TryGetProperty("status", out var statusEl) ? statusEl.GetString() : null);
                    latestTime = when;
                }
            }

            return latest;
        }

        private record UpdateInfo(string? Text, string? When, string? Status);
    }
}
