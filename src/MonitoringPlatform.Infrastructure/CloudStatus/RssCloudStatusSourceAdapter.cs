using System.Globalization;
using System.Net.Http;
using System.Xml.Linq;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Enums;

namespace MonitoringPlatform.Infrastructure.CloudStatus
{
    public class RssCloudStatusSourceAdapter : ICloudStatusSourceAdapter
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public RssCloudStatusSourceAdapter(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        public bool CanHandle(CloudStatusSourceType sourceType) => sourceType == CloudStatusSourceType.Rss;

        public async Task<IReadOnlyList<CloudIncidentIngestionDto>> GetIncidentsAsync(
            CloudProviderIngestionTargetDto provider,
            CancellationToken cancellationToken)
        {
            var client = _httpClientFactory.CreateClient("CloudStatusHttpClient");
            var xml = await client.GetStringAsync(provider.SourceUrl, cancellationToken);
            var document = XDocument.Parse(xml);

            var result = document
                .Descendants()
                .Where(x => x.Name.LocalName == "item")
                .Select(item =>
                {
                    var title = item.Elements().FirstOrDefault(x => x.Name.LocalName == "title")?.Value?.Trim();
                    if (string.IsNullOrWhiteSpace(title))
                    {
                        return null;
                    }

                    var link = item.Elements().FirstOrDefault(x => x.Name.LocalName == "guid")?.Value?.Trim();
                    if (string.IsNullOrWhiteSpace(link))
                    {
                        link = item.Elements().FirstOrDefault(x => x.Name.LocalName == "link")?.Value?.Trim();
                    }

                    var description = item.Elements().FirstOrDefault(x => x.Name.LocalName == "description")?.Value;
                    var statusText = item.Elements().FirstOrDefault(x => x.Name.LocalName == "status")?.Value?.Trim();
                    var pubDate = item.Elements().FirstOrDefault(x => x.Name.LocalName == "pubDate")?.Value?.Trim();
                    var occurredAt = DateTimeOffset.TryParse(pubDate, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var dto)
                        ? dto.UtcDateTime
                        : DateTime.UtcNow;

                    var isAwsFeed = string.Equals(provider.Slug, "aws", StringComparison.OrdinalIgnoreCase);
                    var affectedServices = isAwsFeed
                        ? CloudStatusParsingHelpers.InferAwsServices(title, link)
                        : new[] { provider.Name };
                    var normalizedDescription = CloudStatusParsingHelpers.ComposeDescription(description, title);
                    var incidentStatus = isAwsFeed
                        ? CloudIncidentStatus.Resolved
                        : CloudStatusParsingHelpers.MapGenericRssStatus(statusText, title, normalizedDescription);

                    return new CloudIncidentIngestionDto
                    {
                        ExternalId = link ?? title,
                        Title = title,
                        Description = normalizedDescription,
                        Severity = isAwsFeed
                            ? CloudStatusParsingHelpers.MapAwsSeverity(title)
                            : CloudStatusParsingHelpers.MapGenericRssSeverity(title, normalizedDescription, statusText),
                        Status = incidentStatus,
                        Region = CloudStatusParsingHelpers.InferRegion(title, normalizedDescription, affectedServices, link),
                        AffectedServices = affectedServices,
                        Source = "RSS Feed",
                        OfficialUrl = string.IsNullOrWhiteSpace(link) ? provider.SourceUrl : link,
                        OccurredAt = occurredAt,
                        LastUpdatedAt = occurredAt,
                        ResolvedAt = incidentStatus == CloudIncidentStatus.Resolved ? occurredAt : null,
                    };
                })
                .Where(x => x is not null)
                .Select(x => x!)
                .ToArray();

            return result;
        }
    }
}
