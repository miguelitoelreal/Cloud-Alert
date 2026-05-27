using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Enums;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.Infrastructure.CloudStatus
{
    public class MicrosoftGraphCloudStatusSourceAdapter : ICloudStatusSourceAdapter
    {
        private static readonly SemaphoreSlim TokenLock = new(1, 1);
        private static string? _cachedAccessToken;
        private static DateTime _cachedAccessTokenExpiresAtUtc;

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly MicrosoftGraphOptions _options;
        private readonly ILogger<MicrosoftGraphCloudStatusSourceAdapter> _logger;
        private readonly AppDbContext _context;

        private string _effectiveTenantId = string.Empty;
        private string _effectiveClientId = string.Empty;
        private string _effectiveClientSecret = string.Empty;

        public MicrosoftGraphCloudStatusSourceAdapter(
            IHttpClientFactory httpClientFactory,
            IOptions<MicrosoftGraphOptions> options,
            ILogger<MicrosoftGraphCloudStatusSourceAdapter> logger,
            AppDbContext context)
        {
            _httpClientFactory = httpClientFactory;
            _options = options.Value;
            _logger = logger;
            _context = context;
        }

        public bool CanHandle(CloudStatusSourceType sourceType) => sourceType == CloudStatusSourceType.MicrosoftGraphServiceHealth;

        public async Task<IReadOnlyList<CloudIncidentIngestionDto>> GetIncidentsAsync(
            CloudProviderIngestionTargetDto provider,
            CancellationToken cancellationToken)
        {
            ValidateConfiguration();

            var accessToken = await GetAccessTokenAsync(cancellationToken);
            var issues = await GetIssuesAsync(accessToken, cancellationToken);
            var incidents = new List<CloudIncidentIngestionDto>();

            foreach (var issue in issues)
            {
                var issueId = TryGetString(issue, "id");
                var service = TryGetString(issue, "service");
                var title = TryGetString(issue, "title");
                var impactDescription = TryGetString(issue, "impactDescription");
                var feature = TryGetString(issue, "feature");
                var featureGroup = TryGetString(issue, "featureGroup");

                if (string.IsNullOrWhiteSpace(issueId) || string.IsNullOrWhiteSpace(title))
                {
                    continue;
                }

                if (!CloudStatusParsingHelpers.MatchesMicrosoftGraphService(
                        provider.MetadataJson,
                        service,
                        feature,
                        featureGroup,
                        title,
                        impactDescription))
                {
                    continue;
                }

                var isResolved = TryGetBoolean(issue, "isResolved") ?? false;
                var graphStatus = TryGetString(issue, "status");
                var latestPost = GetLatestPost(issue);
                var latestDescription = latestPost.HasValue
                    ? TryGetString(latestPost.Value, "description")
                    : null;

                var description = CloudStatusParsingHelpers.ComposeDescription(latestDescription, impactDescription ?? title);
                var affectedServices = CloudStatusParsingHelpers.NormalizeAffectedServices(
                    new[] { service, featureGroup, feature, provider.Name });
                var occurredAt = CloudStatusParsingHelpers.ParseDateTime(TryGetString(issue, "startDateTime"), DateTime.UtcNow);
                var lastUpdatedAt = CloudStatusParsingHelpers.ParseDateTime(
                    latestPost.HasValue
                        ? TryGetString(latestPost.Value, "createdDateTime") ?? TryGetString(latestPost.Value, "publishedDateTime")
                        : TryGetString(issue, "lastModifiedDateTime"),
                    occurredAt);
                DateTime? resolvedAt = isResolved
                    ? CloudStatusParsingHelpers.ParseNullableDateTime(TryGetString(issue, "endDateTime")) ?? lastUpdatedAt
                    : null;

                incidents.Add(new CloudIncidentIngestionDto
                {
                    ExternalId = issueId,
                    Title = title.Trim(),
                    Description = description,
                    Severity = CloudStatusParsingHelpers.MapMicrosoftGraphSeverity(
                        graphStatus,
                        TryGetString(issue, "classification"),
                        title,
                        description),
                    Status = CloudStatusParsingHelpers.MapMicrosoftGraphStatus(graphStatus, isResolved),
                    Region = CloudStatusParsingHelpers.InferRegion(title, description, affectedServices, provider.StatusPageUrl),
                    AffectedServices = affectedServices,
                    Source = "Microsoft Graph Service Health",
                    OfficialUrl = provider.StatusPageUrl ?? BuildIssuesUrl(),
                    OccurredAt = occurredAt,
                    LastUpdatedAt = lastUpdatedAt,
                    ResolvedAt = resolvedAt,
                });
            }

            return incidents;
        }

        private void ValidateConfiguration()
        {
            if (_options.Enabled
                && !string.IsNullOrWhiteSpace(_options.TenantId)
                && !string.IsNullOrWhiteSpace(_options.ClientId)
                && !string.IsNullOrWhiteSpace(_options.ClientSecret))
            {
                _effectiveTenantId = _options.TenantId;
                _effectiveClientId = _options.ClientId;
                _effectiveClientSecret = _options.ClientSecret;
                return;
            }

            var integration = _context.MicrosoftIntegrations
                .AsNoTracking()
                .FirstOrDefault(x => x.IsActive);

            if (integration != null
                && !string.IsNullOrWhiteSpace(integration.MicrosoftTenantId)
                && !string.IsNullOrWhiteSpace(integration.ClientId)
                && !string.IsNullOrWhiteSpace(integration.ClientSecret))
            {
                _effectiveTenantId = integration.MicrosoftTenantId;
                _effectiveClientId = integration.ClientId;
                _effectiveClientSecret = integration.ClientSecret;
                return;
            }

            throw new InvalidOperationException(
                "Microsoft Graph Service Health está deshabilitado en configuración. Configure la integración global o agréguela desde el panel de Integraciones.");
        }

        private async Task<string> GetAccessTokenAsync(CancellationToken cancellationToken)
        {
            if (!string.IsNullOrWhiteSpace(_cachedAccessToken)
                && _cachedAccessTokenExpiresAtUtc > DateTime.UtcNow.AddMinutes(2))
            {
                return _cachedAccessToken;
            }

            await TokenLock.WaitAsync(cancellationToken);
            try
            {
                if (!string.IsNullOrWhiteSpace(_cachedAccessToken)
                    && _cachedAccessTokenExpiresAtUtc > DateTime.UtcNow.AddMinutes(2))
                {
                    return _cachedAccessToken;
                }

                var client = _httpClientFactory.CreateClient("CloudStatusHttpClient");
                using var request = new HttpRequestMessage(HttpMethod.Post, BuildTokenUrl())
                {
                    Content = new FormUrlEncodedContent(new Dictionary<string, string>
                    {
                        ["grant_type"] = "client_credentials",
                        ["client_id"] = _effectiveClientId,
                        ["client_secret"] = _effectiveClientSecret,
                        ["scope"] = "https://graph.microsoft.com/.default",
                    }),
                };

                using var response = await client.SendAsync(request, cancellationToken);
                var payload = await response.Content.ReadAsStringAsync(cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning(
                        "Microsoft Graph token request failed. StatusCode: {StatusCode}. Payload: {Payload}",
                        (int)response.StatusCode,
                        payload);

                    throw new InvalidOperationException(
                        "No se pudo autenticar contra Microsoft Graph. Verifica TenantId, ClientId, ClientSecret y el permiso ServiceHealth.Read.All con admin consent.");
                }

                using var document = JsonDocument.Parse(payload);
                var accessToken = TryGetString(document.RootElement, "access_token");
                var expiresInSeconds = TryGetInt32(document.RootElement, "expires_in") ?? 3600;

                if (string.IsNullOrWhiteSpace(accessToken))
                {
                    throw new InvalidOperationException("Microsoft Graph no devolvió un access token válido.");
                }

                _cachedAccessToken = accessToken;
                _cachedAccessTokenExpiresAtUtc = DateTime.UtcNow.AddSeconds(Math.Max(300, expiresInSeconds - 300));
                return accessToken;
            }
            finally
            {
                TokenLock.Release();
            }
        }

        private async Task<IReadOnlyList<JsonElement>> GetIssuesAsync(string accessToken, CancellationToken cancellationToken)
        {
            var client = _httpClientFactory.CreateClient("CloudStatusHttpClient");
            var issues = new List<JsonElement>();
            var nextUrl = BuildIssuesUrl();

            while (!string.IsNullOrWhiteSpace(nextUrl))
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, nextUrl);
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
                request.Headers.TryAddWithoutValidation("Prefer", "odata.maxpagesize=100");

                using var response = await client.SendAsync(request, cancellationToken);
                var payload = await response.Content.ReadAsStringAsync(cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning(
                        "Microsoft Graph issues request failed. StatusCode: {StatusCode}. Payload: {Payload}",
                        (int)response.StatusCode,
                        payload);

                    throw new InvalidOperationException(
                        "No se pudo consultar Service Health en Microsoft Graph. Verifica que la app tenga ServiceHealth.Read.All y admin consent sobre el tenant.");
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

        private string BuildTokenUrl()
        {
            var authority = _options.Enabled
                ? _options.AuthorityBaseUrl
                : "https://login.microsoftonline.com";
            return $"{authority.TrimEnd('/')}/{_effectiveTenantId.Trim()}/oauth2/v2.0/token";
        }

        private string BuildIssuesUrl()
        {
            var graphBase = _options.Enabled
                ? _options.GraphBaseUrl
                : "https://graph.microsoft.com/v1.0";
            return $"{graphBase.TrimEnd('/')}/admin/serviceAnnouncement/issues";
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
                var createdAt = CloudStatusParsingHelpers.ParseDateTime(
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

        private static int? TryGetInt32(JsonElement element, string propertyName)
        {
            if (!element.TryGetProperty(propertyName, out var value))
            {
                return null;
            }

            if (value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var intValue))
            {
                return intValue;
            }

            return value.ValueKind == JsonValueKind.String && int.TryParse(value.GetString(), out var parsed)
                ? parsed
                : null;
        }
    }
}
