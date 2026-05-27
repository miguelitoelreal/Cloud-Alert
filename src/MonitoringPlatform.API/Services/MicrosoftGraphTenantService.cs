using System.Net.Http.Headers;
using System.Text.Json;
using MonitoringPlatform.Application.DTOs.Microsoft;
using MonitoringPlatform.Domain.Enums;

namespace MonitoringPlatform.API.Services;

public class MicrosoftGraphTenantService
{
    private readonly IHttpClientFactory _httpClientFactory;

    public MicrosoftGraphTenantService(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public async Task<IReadOnlyList<MicrosoftGraphIncidentDto>> GetIncidentsAsync(
        string microsoftTenantId,
        string clientId,
        string clientSecret,
        CancellationToken cancellationToken)
    {
        var accessToken = await GetAccessTokenAsync(microsoftTenantId, clientId, clientSecret, cancellationToken);
        var issues = await GetIssuesAsync(accessToken, cancellationToken);
        var incidents = new List<MicrosoftGraphIncidentDto>();

        foreach (var issue in issues)
        {
            var issueId = TryGetString(issue, "id");
            var service = TryGetString(issue, "service");
            var title = TryGetString(issue, "title");
            var impactDescription = TryGetString(issue, "impactDescription");

            if (string.IsNullOrWhiteSpace(issueId) || string.IsNullOrWhiteSpace(title))
            {
                continue;
            }

            var isResolved = TryGetBoolean(issue, "isResolved") ?? false;
            var graphStatus = TryGetString(issue, "status");
            var latestPost = GetLatestPost(issue);
            var latestDescription = latestPost.HasValue
                ? TryGetString(latestPost.Value, "description")
                : null;

            var description = ComposeDescription(latestDescription, impactDescription ?? title);
            var affectedServices = NormalizeAffectedServices(new[] { service });
            var occurredAt = ParseDateTime(TryGetString(issue, "startDateTime"), DateTime.UtcNow);
            var lastUpdatedAt = ParseDateTime(
                latestPost.HasValue
                    ? TryGetString(latestPost.Value, "createdDateTime") ?? TryGetString(latestPost.Value, "publishedDateTime")
                    : TryGetString(issue, "lastModifiedDateTime"),
                occurredAt);
            DateTime? resolvedAt = isResolved
                ? ParseNullableDateTime(TryGetString(issue, "endDateTime")) ?? lastUpdatedAt
                : null;

            incidents.Add(new MicrosoftGraphIncidentDto
            {
                Id = issueId,
                Title = title.Trim(),
                Description = description,
                Severity = MapSeverity(graphStatus),
                Status = isResolved ? CloudIncidentStatus.Resolved : MapStatus(graphStatus),
                Region = InferRegion(title, description, affectedServices),
                AffectedServices = affectedServices,
                OfficialUrl = $"https://status.microsoft/{issueId}",
                IsActive = !isResolved,
                OccurredAt = occurredAt,
                LastUpdatedAt = lastUpdatedAt,
                ResolvedAt = resolvedAt,
            });
        }

        return incidents;
    }

    private async Task<string> GetAccessTokenAsync(
        string microsoftTenantId,
        string clientId,
        string clientSecret,
        CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient();
        var tokenUrl = $"https://login.microsoftonline.com/{microsoftTenantId.Trim()}/oauth2/v2.0/token";

        using var request = new HttpRequestMessage(HttpMethod.Post, tokenUrl)
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "client_credentials",
                ["client_id"] = clientId,
                ["client_secret"] = clientSecret,
                ["scope"] = "https://graph.microsoft.com/.default",
            }),
        };

        using var response = await client.SendAsync(request, cancellationToken);
        var payload = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Microsoft Graph token request failed: {payload}");
        }

        using var document = JsonDocument.Parse(payload);
        var accessToken = TryGetString(document.RootElement, "access_token");
        if (string.IsNullOrWhiteSpace(accessToken))
        {
            throw new InvalidOperationException("Microsoft Graph no devolvió un access token válido.");
        }

        return accessToken;
    }

    private async Task<IReadOnlyList<JsonElement>> GetIssuesAsync(string accessToken, CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient();
        var issues = new List<JsonElement>();
        var nextUrl = "https://graph.microsoft.com/v1.0/admin/serviceAnnouncement/issues";

        while (!string.IsNullOrWhiteSpace(nextUrl))
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, nextUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            request.Headers.TryAddWithoutValidation("Prefer", "odata.maxpagesize=100");

            using var response = await client.SendAsync(request, cancellationToken);
            var payload = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException($"Microsoft Graph issues request failed: {payload}");
            }

            using var document = JsonDocument.Parse(payload);
            if (!document.RootElement.TryGetProperty("value", out var valueElement) || valueElement.ValueKind != JsonValueKind.Array)
            {
                break;
            }

            issues.AddRange(valueElement.EnumerateArray().Select(x => x.Clone()));
            nextUrl = TryGetString(document.RootElement, "@odata.nextLink");
        }

        return issues;
    }

    private static string ComposeDescription(string? latestPostDescription, string impactDescription)
    {
        if (!string.IsNullOrWhiteSpace(latestPostDescription))
        {
            return latestPostDescription.Trim();
        }
        return impactDescription.Trim();
    }

    private static IReadOnlyList<string> NormalizeAffectedServices(IEnumerable<string?> services)
    {
        return services
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => s!.Trim())
            .Distinct()
            .ToList();
    }

    private static string? InferRegion(string title, string description, IReadOnlyList<string> affectedServices)
    {
        var text = $"{title} {description}";
        var regions = new[] { "North America", "South America", "Europe", "Asia", "Asia Pacific", "Middle East", "Africa", "Australia", "Japan", "India", "Brazil", "UK", "Germany", "France", "Canada", "Mexico" };
        foreach (var region in regions)
        {
            if (text.Contains(region, StringComparison.OrdinalIgnoreCase))
            {
                return region;
            }
        }
        return null;
    }

    private static CloudIncidentSeverity MapSeverity(string? graphStatus)
    {
        var status = graphStatus?.ToLowerInvariant() ?? "";
        return status switch
        {
            "service degradation" or "extendedrecovery" or "investigating" => CloudIncidentSeverity.Major,
            "service interruption" => CloudIncidentSeverity.Critical,
            _ => CloudIncidentSeverity.Minor,
        };
    }

    private static CloudIncidentStatus MapStatus(string? graphStatus)
    {
        var status = graphStatus?.ToLowerInvariant() ?? "";
        return status switch
        {
            "service degradation" => CloudIncidentStatus.Monitoring,
            "service interruption" => CloudIncidentStatus.Identified,
            "investigating" => CloudIncidentStatus.Investigating,
            "extendedrecovery" => CloudIncidentStatus.Monitoring,
            _ => CloudIncidentStatus.Investigating,
        };
    }

    private static DateTime ParseDateTime(string? value, DateTime fallback)
    {
        if (!DateTime.TryParse(value, out var result)) return fallback;
        return result.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(result, DateTimeKind.Utc)
            : result.ToUniversalTime();
    }

    private static DateTime? ParseNullableDateTime(string? value)
    {
        if (!DateTime.TryParse(value, out var result)) return null;
        return result.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(result, DateTimeKind.Utc)
            : result.ToUniversalTime();
    }

    private static JsonElement? GetLatestPost(JsonElement issue)
    {
        if (!issue.TryGetProperty("posts", out var postsElement) || postsElement.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        JsonElement? latest = null;
        DateTime latestTime = DateTime.MinValue;

        foreach (var post in postsElement.EnumerateArray())
        {
            var createdAt = ParseDateTime(
                TryGetString(post, "createdDateTime") ?? TryGetString(post, "publishedDateTime"),
                DateTime.MinValue);

            if (latest is null || createdAt >= latestTime)
            {
                latest = post;
                latestTime = createdAt;
            }
        }

        return latest;
    }

    private static string? TryGetString(JsonElement element, string propertyName)
    {
        return element.TryGetProperty(propertyName, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;
    }

    private static bool? TryGetBoolean(JsonElement element, string propertyName)
    {
        return element.TryGetProperty(propertyName, out var value) && value.ValueKind is JsonValueKind.True or JsonValueKind.False
            ? value.GetBoolean()
            : null;
    }
}
