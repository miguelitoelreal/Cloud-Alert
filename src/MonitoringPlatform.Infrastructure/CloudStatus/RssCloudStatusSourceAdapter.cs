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
                    var titleCandidate = item.Elements().FirstOrDefault(x => x.Name.LocalName == "title")?.Value;
                    if (string.IsNullOrWhiteSpace(titleCandidate))
                    {
                        return null;
                    }

                    var title = titleCandidate.Trim();
                    var linkCandidate = item.Elements().FirstOrDefault(x => x.Name.LocalName == "guid")?.Value;
                    var link = !string.IsNullOrWhiteSpace(linkCandidate)
                        ? linkCandidate.Trim()
                        : item.Elements().FirstOrDefault(x => x.Name.LocalName == "link")?.Value?.Trim();

                    var description = item.Elements().FirstOrDefault(x => x.Name.LocalName == "description")?.Value;
                    var statusText = item.Elements().FirstOrDefault(x => x.Name.LocalName == "status")?.Value?.Trim();
                    var pubDate = item.Elements().FirstOrDefault(x => x.Name.LocalName == "pubDate")?.Value?.Trim();
                    Console.WriteLine($"[RSS-RAW] Provider={provider.Name} Title='{title.Substring(0, Math.Min(30, title.Length))}' pubDateRaw='{pubDate}'");
                    var occurredAt = CloudStatusParsingHelpers.ParseDateTime(pubDate, DateTime.UtcNow);

                    var affectedServices = new[] { provider.Name };
                    var normalizedDescription = CloudStatusParsingHelpers.ComposeDescription(description, title);
                    var incidentStatus = CloudStatusParsingHelpers.MapGenericRssStatus(statusText, title, normalizedDescription);

                    return new CloudIncidentIngestionDto
                    {
                        ExternalId = link ?? title,
                        Title = title,
                        Description = normalizedDescription,
                        Severity = CloudStatusParsingHelpers.MapGenericRssSeverity(title, normalizedDescription, statusText),
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
