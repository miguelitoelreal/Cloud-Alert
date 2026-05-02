using System.Net;
using System.Text.Json;
using System.Xml.Linq;
using CloudAlertApp.Models;
using Microsoft.Extensions.Caching.Memory;

namespace CloudAlertApp.Services;

public interface ICloudStatusService
{
    Task<CloudStatusPageViewModel> GetSnapshotAsync(CancellationToken cancellationToken = default);
}

public class CloudStatusService : ICloudStatusService
{
    private const string CacheKey = "cloud-status-snapshot";

    private readonly HttpClient _httpClient;
    private readonly IMemoryCache _memoryCache;
    private readonly ILogger<CloudStatusService> _logger;

    public CloudStatusService(HttpClient httpClient, IMemoryCache memoryCache, ILogger<CloudStatusService> logger)
    {
        _httpClient = httpClient;
        _memoryCache = memoryCache;
        _logger = logger;
    }

    public Task<CloudStatusPageViewModel> GetSnapshotAsync(CancellationToken cancellationToken = default)
    {
        return _memoryCache.GetOrCreateAsync(CacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(60);

            var checkedAtUtc = DateTimeOffset.UtcNow;
            var services = await Task.WhenAll(
                GetAwsStatusAsync(cancellationToken),
                GetAzureStatusAsync(cancellationToken),
                GetGoogleCloudStatusAsync(cancellationToken),
                GetCloudflareStatusAsync(cancellationToken));

            var orderedServices = services.OrderBy(service => service.SortOrder).ToList();
            var healthyCount = orderedServices.Count(service => service.Level == "success");
            var attentionCount = orderedServices.Count - healthyCount;
            var lastUpdatedAtUtc = orderedServices.Max(service => service.SourceUpdatedAtUtc);

            return new CloudStatusPageViewModel
            {
                LastCheckedAtUtc = checkedAtUtc,
                LastUpdatedAtUtc = lastUpdatedAtUtc,
                HealthyCount = healthyCount,
                AttentionCount = attentionCount,
                Overview = BuildOverview(healthyCount, attentionCount, orderedServices),
                Services = orderedServices
            };
        })!;
    }

    private async Task<CloudServiceStatusViewModel> GetAwsStatusAsync(CancellationToken cancellationToken)
    {
        const string sourceUrl = "https://status.aws.amazon.com/rss/all.rss";

        try
        {
            var document = await LoadXmlAsync(sourceUrl, cancellationToken);
            var channel = document.Root?.Element("channel");
            var lastBuildDate = ParseDate(channel?.Element("lastBuildDate")?.Value) ?? DateTimeOffset.UtcNow;
            var firstItem = channel?.Elements("item").FirstOrDefault();

            if (firstItem is null)
            {
                return CreateOperationalStatus("AWS", "AWS RSS", sourceUrl, lastBuildDate, "Sin incidentes recientes publicados en el feed.", 1);
            }

            var title = firstItem.Element("title")?.Value?.Trim() ?? "Actualizacion reciente";
            var description = NormalizeText(firstItem.Element("description")?.Value) ?? "Actualizacion reciente de AWS.";
            var itemDate = ParseDate(firstItem.Element("pubDate")?.Value) ?? lastBuildDate;
            var recentEvent = itemDate >= DateTimeOffset.UtcNow.AddDays(-3);

            if (!recentEvent)
            {
                return CreateOperationalStatus("AWS", "AWS RSS", sourceUrl, lastBuildDate, "Sin eventos publicos recientes en las ultimas 72 horas.", 1);
            }

            var (displayStatus, level) = MapRssTitleToLevel(title);

            return new CloudServiceStatusViewModel
            {
                Name = "AWS",
                DisplayStatus = displayStatus,
                Level = level,
                Scope = "Global AWS status feed",
                Summary = Truncate(description, 180),
                SourceLabel = "AWS RSS",
                SourceUrl = sourceUrl,
                SourceUpdatedAtUtc = itemDate,
                SortOrder = 1
            };
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "No se pudo cargar el estado de AWS.");
            return CreateUnavailableStatus("AWS", "AWS RSS", sourceUrl, 1);
        }
    }

    private async Task<CloudServiceStatusViewModel> GetAzureStatusAsync(CancellationToken cancellationToken)
    {
        const string sourceUrl = "https://azure.status.microsoft/en-us/status/feed/";

        try
        {
            var document = await LoadXmlAsync(sourceUrl, cancellationToken);
            var channel = document.Root?.Element("channel");
            var lastBuildDate = ParseDate(channel?.Element("lastBuildDate")?.Value) ?? DateTimeOffset.UtcNow;
            var firstItem = channel?.Elements("item").FirstOrDefault();

            if (firstItem is null)
            {
                return CreateOperationalStatus("Azure", "Azure RSS", sourceUrl, lastBuildDate, "Sin incidentes activos publicados en el feed de Azure.", 2);
            }

            var title = firstItem.Element("title")?.Value?.Trim() ?? "Actualizacion reciente";
            var description = NormalizeText(firstItem.Element("description")?.Value) ?? "Actualizacion reciente de Azure.";
            var itemDate = ParseDate(firstItem.Element("pubDate")?.Value) ?? lastBuildDate;
            var recentEvent = itemDate >= DateTimeOffset.UtcNow.AddDays(-3);

            if (!recentEvent)
            {
                return CreateOperationalStatus("Azure", "Azure RSS", sourceUrl, lastBuildDate, "El feed no reporta eventos recientes en las ultimas 72 horas.", 2);
            }

            var (displayStatus, level) = MapRssTitleToLevel(title);

            return new CloudServiceStatusViewModel
            {
                Name = "Azure",
                DisplayStatus = displayStatus,
                Level = level,
                Scope = "Global Azure status feed",
                Summary = Truncate(description, 180),
                SourceLabel = "Azure RSS",
                SourceUrl = sourceUrl,
                SourceUpdatedAtUtc = itemDate,
                SortOrder = 2
            };
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "No se pudo cargar el estado de Azure.");
            return CreateUnavailableStatus("Azure", "Azure RSS", sourceUrl, 2);
        }
    }

    private async Task<CloudServiceStatusViewModel> GetGoogleCloudStatusAsync(CancellationToken cancellationToken)
    {
        const string sourceUrl = "https://status.cloud.google.com/incidents.json";

        try
        {
            using var response = await _httpClient.GetAsync(sourceUrl, cancellationToken);
            response.EnsureSuccessStatusCode();

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            var incidents = document.RootElement.EnumerateArray().ToList();
            var activeIncident = incidents.FirstOrDefault(incident => !incident.TryGetProperty("end", out var endProperty) || string.IsNullOrWhiteSpace(endProperty.GetString()));

            if (activeIncident.ValueKind == JsonValueKind.Undefined)
            {
                var latestIncident = incidents.FirstOrDefault();
                var latestUpdate = latestIncident.ValueKind == JsonValueKind.Undefined
                    ? DateTimeOffset.UtcNow
                    : ParseDate(GetString(latestIncident, "modified")) ?? DateTimeOffset.UtcNow;

                return CreateOperationalStatus("Google Cloud", "Google Cloud incidents API", sourceUrl, latestUpdate, "No hay incidentes activos en la API publica de Google Cloud.", 3);
            }

            var severity = GetString(activeIncident, "severity");
            var statusImpact = GetString(activeIncident, "status_impact");
            var summary = GetString(activeIncident, "external_desc") ?? "Incidente activo reportado por Google Cloud.";
            var modified = ParseDate(GetString(activeIncident, "modified")) ?? DateTimeOffset.UtcNow;
            var affectedLocations = activeIncident.TryGetProperty("currently_affected_locations", out var locationProperty)
                ? locationProperty.GetArrayLength()
                : 0;
            var scope = affectedLocations > 0 ? $"{affectedLocations} regiones afectadas" : "Global";
            var (displayStatus, level) = MapGoogleSeverity(severity, statusImpact);

            return new CloudServiceStatusViewModel
            {
                Name = "Google Cloud",
                DisplayStatus = displayStatus,
                Level = level,
                Scope = scope,
                Summary = Truncate(summary, 180),
                SourceLabel = "Google Cloud incidents API",
                SourceUrl = sourceUrl,
                SourceUpdatedAtUtc = modified,
                SortOrder = 3
            };
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "No se pudo cargar el estado de Google Cloud.");
            return CreateUnavailableStatus("Google Cloud", "Google Cloud incidents API", sourceUrl, 3);
        }
    }

    private async Task<CloudServiceStatusViewModel> GetCloudflareStatusAsync(CancellationToken cancellationToken)
    {
        const string sourceUrl = "https://www.cloudflarestatus.com/api/v2/summary.json";

        try
        {
            using var response = await _httpClient.GetAsync(sourceUrl, cancellationToken);
            response.EnsureSuccessStatusCode();

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            var root = document.RootElement;
            var page = root.GetProperty("page");
            var status = root.GetProperty("status");
            var components = root.TryGetProperty("components", out var componentsProperty)
                ? componentsProperty.EnumerateArray().ToList()
                : new List<JsonElement>();

            var degradedCount = components.Count(component =>
            {
                var componentStatus = GetString(component, "status");
                return !string.Equals(componentStatus, "operational", StringComparison.OrdinalIgnoreCase);
            });

            var indicator = GetString(status, "indicator") ?? "none";
            var description = GetString(status, "description") ?? "Operational";
            var updatedAtUtc = ParseDate(GetString(page, "updated_at")) ?? DateTimeOffset.UtcNow;
            var (displayStatus, level) = MapCloudflareIndicator(indicator, description);
            var summary = degradedCount > 0
                ? $"{description}. Componentes con atencion: {degradedCount}."
                : $"{description}. No hay componentes degradados en el resumen publico.";

            return new CloudServiceStatusViewModel
            {
                Name = "Cloudflare",
                DisplayStatus = displayStatus,
                Level = level,
                Scope = "Global edge network",
                Summary = summary,
                SourceLabel = "Cloudflare status API",
                SourceUrl = sourceUrl,
                SourceUpdatedAtUtc = updatedAtUtc,
                SortOrder = 4
            };
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "No se pudo cargar el estado de Cloudflare.");
            return CreateUnavailableStatus("Cloudflare", "Cloudflare status API", sourceUrl, 4);
        }
    }

    private static string BuildOverview(int healthyCount, int attentionCount, IReadOnlyCollection<CloudServiceStatusViewModel> services)
    {
        if (attentionCount == 0)
        {
            return $"{healthyCount} fuentes publicas se encuentran operativas segun la ultima verificacion.";
        }

        var affectedProviders = services
            .Where(service => service.Level != "success")
            .Select(service => service.Name)
            .ToList();

        return $"{healthyCount} fuentes estables y {attentionCount} con atencion: {string.Join(", ", affectedProviders)}.";
    }

    private async Task<XDocument> LoadXmlAsync(string sourceUrl, CancellationToken cancellationToken)
    {
        using var response = await _httpClient.GetAsync(sourceUrl, cancellationToken);
        response.EnsureSuccessStatusCode();

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        return XDocument.Load(stream);
    }

    private static CloudServiceStatusViewModel CreateOperationalStatus(string name, string sourceLabel, string sourceUrl, DateTimeOffset updatedAtUtc, string summary, int sortOrder)
    {
        return new CloudServiceStatusViewModel
        {
            Name = name,
            DisplayStatus = "Operativo",
            Level = "success",
            Scope = "Global",
            Summary = summary,
            SourceLabel = sourceLabel,
            SourceUrl = sourceUrl,
            SourceUpdatedAtUtc = updatedAtUtc,
            SortOrder = sortOrder
        };
    }

    private static CloudServiceStatusViewModel CreateUnavailableStatus(string name, string sourceLabel, string sourceUrl, int sortOrder)
    {
        return new CloudServiceStatusViewModel
        {
            Name = name,
            DisplayStatus = "No disponible",
            Level = "info",
            Scope = "Global",
            Summary = "No se pudo consultar la fuente publica en este momento.",
            SourceLabel = sourceLabel,
            SourceUrl = sourceUrl,
            SourceUpdatedAtUtc = DateTimeOffset.UtcNow,
            SortOrder = sortOrder
        };
    }

    private static (string DisplayStatus, string Level) MapRssTitleToLevel(string title)
    {
        var normalized = title.ToLowerInvariant();

        if (normalized.Contains("disruption"))
        {
            return ("Incidente", "danger");
        }

        if (normalized.Contains("degradation") || normalized.Contains("impact"))
        {
            return ("Degradado", "warning");
        }

        return ("Operativo", "success");
    }

    private static (string DisplayStatus, string Level) MapGoogleSeverity(string? severity, string? statusImpact)
    {
        var normalizedSeverity = severity?.ToLowerInvariant() ?? string.Empty;
        var normalizedImpact = statusImpact?.ToLowerInvariant() ?? string.Empty;

        if (normalizedSeverity == "high" || normalizedImpact.Contains("outage"))
        {
            return ("Interrupcion", "danger");
        }

        if (normalizedSeverity == "medium" || normalizedImpact.Contains("disruption"))
        {
            return ("Degradado", "warning");
        }

        if (normalizedImpact.Contains("information"))
        {
            return ("Informativo", "info");
        }

        return ("Operativo", "success");
    }

    private static (string DisplayStatus, string Level) MapCloudflareIndicator(string indicator, string description)
    {
        var normalizedIndicator = indicator.ToLowerInvariant();

        return normalizedIndicator switch
        {
            "critical" => ("Interrupcion", "danger"),
            "major" => ("Interrupcion", "danger"),
            "minor" => ("Degradado", "warning"),
            "maintenance" => ("Mantenimiento", "info"),
            _ => (string.Equals(description, "All Systems Operational", StringComparison.OrdinalIgnoreCase) ? "Operativo" : description, "success")
        };
    }

    private static string? GetString(JsonElement element, string propertyName)
    {
        return element.TryGetProperty(propertyName, out var property) ? property.GetString() : null;
    }

    private static DateTimeOffset? ParseDate(string? value)
    {
        return DateTimeOffset.TryParse(value, out var parsed) ? parsed : null;
    }

    private static string? NormalizeText(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return null;
        }

        var decoded = WebUtility.HtmlDecode(input);
        return string.Join(' ', decoded.Split(new[] { '\r', '\n', '\t' }, StringSplitOptions.RemoveEmptyEntries)).Trim();
    }

    private static string Truncate(string? input, int maxLength)
    {
        var value = NormalizeText(input) ?? string.Empty;
        if (value.Length <= maxLength)
        {
            return value;
        }

        return value[..(maxLength - 1)].TrimEnd() + "...";
    }
}