using System.Net.Http;
using System.Xml.Linq;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Enums;

namespace MonitoringPlatform.Infrastructure.CloudStatus
{
    public class AtomCloudStatusSourceAdapter : ICloudStatusSourceAdapter
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public AtomCloudStatusSourceAdapter(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        public bool CanHandle(CloudStatusSourceType sourceType) => sourceType == CloudStatusSourceType.Atom;

        public async Task<IReadOnlyList<CloudIncidentIngestionDto>> GetIncidentsAsync(
            CloudProviderIngestionTargetDto provider,
            CancellationToken cancellationToken)
        {
            var client = _httpClientFactory.CreateClient("CloudStatusHttpClient");
            var xml = await client.GetStringAsync(provider.SourceUrl, cancellationToken);
            var document = XDocument.Parse(xml);

            var result = document
                .Descendants()
                .Where(x => x.Name.LocalName == "entry")
                .Select(entry =>
                {
                    var title = entry.Elements().FirstOrDefault(x => x.Name.LocalName == "title")?.Value?.Trim();
                    if (string.IsNullOrWhiteSpace(title))
                    {
                        return null;
                    }

                    var link = entry.Elements().FirstOrDefault(x => x.Name.LocalName == "link")?.Attribute("href")?.Value?.Trim();
                    var updated = CloudStatusParsingHelpers.ParseDateTime(
                        entry.Elements().FirstOrDefault(x => x.Name.LocalName == "updated")?.Value?.Trim(),
                        DateTime.UtcNow);

                    var description = entry.Elements().FirstOrDefault(x => x.Name.LocalName is "content" or "summary")?.Value;
                    return new CloudIncidentIngestionDto
                    {
                        ExternalId = link ?? title,
                        Title = title,
                        Description = CloudStatusParsingHelpers.ComposeDescription(description, title),
                        Severity = CloudIncidentSeverity.Minor,
                        Status = CloudIncidentStatus.Resolved,
                        Region = CloudStatusParsingHelpers.InferRegion(title, description, [], link),
                        AffectedServices = [],
                        Source = "Atom Feed",
                        OfficialUrl = link ?? provider.SourceUrl,
                        OccurredAt = updated,
                        LastUpdatedAt = updated,
                        ResolvedAt = updated,
                    };
                })
                .Where(x => x is not null)
                .Select(x => x!)
                .ToArray();

            return result;
        }
    }
}
