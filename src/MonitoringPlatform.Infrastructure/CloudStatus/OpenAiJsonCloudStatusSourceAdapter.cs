using System.Net.Http;
using System.Text.Json;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Enums;

namespace MonitoringPlatform.Infrastructure.CloudStatus
{
    public class OpenAiJsonCloudStatusSourceAdapter : ICloudStatusSourceAdapter
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public OpenAiJsonCloudStatusSourceAdapter(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        public bool CanHandle(CloudStatusSourceType sourceType) => sourceType == CloudStatusSourceType.JsonApi;

        public async Task<IReadOnlyList<CloudIncidentIngestionDto>> GetIncidentsAsync(
            CloudProviderIngestionTargetDto provider,
            CancellationToken cancellationToken)
        {
            var client = _httpClientFactory.CreateClient("CloudStatusHttpClient");
            using var response = await client.GetAsync(provider.SourceUrl, cancellationToken);
            response.EnsureSuccessStatusCode();

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            if (!document.RootElement.TryGetProperty("incidents", out var incidentsElement) || incidentsElement.ValueKind != JsonValueKind.Array)
            {
                return [];
            }

            var result = new List<CloudIncidentIngestionDto>();
            foreach (var incident in incidentsElement.EnumerateArray())
            {
                var incidentId = incident.TryGetProperty("id", out var idElement) ? idElement.GetString() : null;
                var title = incident.TryGetProperty("name", out var nameElement) ? nameElement.GetString() : null;
                if (string.IsNullOrWhiteSpace(incidentId) || string.IsNullOrWhiteSpace(title))
                {
                    continue;
                }

                var latestUpdate = GetLatestIncidentUpdate(incident);
                var latestStatus = latestUpdate.HasValue && latestUpdate.Value.TryGetProperty("status", out var statusElement)
                    ? statusElement.GetString()
                    : incident.TryGetProperty("status", out var incidentStatusElement)
                        ? incidentStatusElement.GetString()
                        : null;

                var description = CloudStatusParsingHelpers.ComposeDescription(
                    latestUpdate.HasValue && latestUpdate.Value.TryGetProperty("body", out var bodyElement)
                        ? bodyElement.GetString()
                        : null,
                    title);

                var officialUrl = !string.IsNullOrWhiteSpace(provider.StatusPageUrl)
                    ? $"{provider.StatusPageUrl.TrimEnd('/')}/incidents/{incidentId}"
                    : provider.SourceUrl;

                var affectedServices = CloudStatusParsingHelpers.InferOpenAiServices(title);
                var occurredAt = CloudStatusParsingHelpers.ParseDateTime(
                    incident.TryGetProperty("created_at", out var createdAtElement)
                        ? createdAtElement.GetString()
                        : null,
                    DateTime.UtcNow);

                result.Add(new CloudIncidentIngestionDto
                {
                    ExternalId = incidentId,
                    Title = title.Trim(),
                    Description = description,
                    Severity = CloudStatusParsingHelpers.MapImpactToSeverity(
                        incident.TryGetProperty("impact", out var impactElement) ? impactElement.GetString() : null),
                    Status = CloudStatusParsingHelpers.MapStatus(latestStatus),
                    Region = CloudStatusParsingHelpers.InferRegion(title, description, affectedServices, officialUrl),
                    AffectedServices = affectedServices,
                    Source = "JSON API",
                    OfficialUrl = officialUrl,
                    OccurredAt = occurredAt,
                    LastUpdatedAt = CloudStatusParsingHelpers.ParseDateTime(
                        incident.TryGetProperty("updated_at", out var updatedAtElement)
                            ? updatedAtElement.GetString()
                            : null,
                        occurredAt),
                    ResolvedAt = CloudStatusParsingHelpers.ParseNullableDateTime(
                        incident.TryGetProperty("resolved_at", out var resolvedAtElement) ? resolvedAtElement.GetString() : null),
                });
            }

            return result;
        }

        private static JsonElement? GetLatestIncidentUpdate(JsonElement incident)
        {
            if (!incident.TryGetProperty("incident_updates", out var updatesElement) || updatesElement.ValueKind != JsonValueKind.Array)
            {
                return null;
            }

            JsonElement? latest = null;
            DateTime latestTime = DateTime.MinValue;

            foreach (var update in updatesElement.EnumerateArray())
            {
                var updatedAt = CloudStatusParsingHelpers.ParseDateTime(
                    update.TryGetProperty("updated_at", out var updatedAtElement)
                        ? updatedAtElement.GetString()
                        : update.TryGetProperty("display_at", out var displayAtElement)
                            ? displayAtElement.GetString()
                            : null,
                    DateTime.MinValue);

                if (latest is null || updatedAt >= latestTime)
                {
                    latest = update;
                    latestTime = updatedAt;
                }
            }

            return latest;
        }
    }
}
