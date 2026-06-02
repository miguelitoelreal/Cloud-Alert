using System.Net.Http;
using System.Xml.Linq;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Enums;

namespace MonitoringPlatform.Infrastructure.CloudStatus
{
    public class AzureCloudStatusSourceAdapter : ICloudStatusSourceAdapter
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public AzureCloudStatusSourceAdapter(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        public bool CanHandle(CloudStatusSourceType sourceType) => sourceType == CloudStatusSourceType.AzureStatusApi;

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
                    var occurredAt = CloudStatusParsingHelpers.ParseDateTime(pubDate, DateTime.UtcNow);

                    var normalizedDescription = CloudStatusParsingHelpers.ComposeDescription(description, title);
                    var affectedServices = InferAzureServices(title, normalizedDescription);
                    var incidentStatus = CloudStatusParsingHelpers.MapGenericRssStatus(statusText, title, normalizedDescription);

                    return new CloudIncidentIngestionDto
                    {
                        ExternalId = link ?? title,
                        Title = title,
                        Description = normalizedDescription,
                        Severity = CloudStatusParsingHelpers.MapGenericRssSeverity(title, normalizedDescription, statusText),
                        Status = incidentStatus,
                        Region = InferAzureRegion(title, normalizedDescription) ?? CloudStatusParsingHelpers.InferRegion(title, normalizedDescription, affectedServices, link),
                        AffectedServices = affectedServices,
                        Source = "Azure Status Feed",
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

        private static IReadOnlyList<string> InferAzureServices(string? title, string? description)
        {
            var text = string.Join(" ", new[] { title, description }.Where(x => !string.IsNullOrWhiteSpace(x)));
            if (string.IsNullOrWhiteSpace(text))
            {
                return ["Azure"];
            }

            var normalized = text.ToLowerInvariant();
            var services = new List<string>();

            // Azure service keywords extracted from common Azure service names
            var azureServiceKeywords = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                { "active directory", "Azure Active Directory" },
                { "aad", "Azure Active Directory" },
                { "entra", "Microsoft Entra ID" },
                { "virtual machines", "Azure Virtual Machines" },
                { "vm", "Azure Virtual Machines" },
                { "app service", "Azure App Service" },
                { "sql database", "Azure SQL Database" },
                { "sql managed instance", "Azure SQL Managed Instance" },
                { "cosmos db", "Azure Cosmos DB" },
                { "storage", "Azure Storage" },
                { "blob storage", "Azure Blob Storage" },
                { "key vault", "Azure Key Vault" },
                { "network", "Azure Network" },
                { "virtual network", "Azure Virtual Network" },
                { "vpn gateway", "Azure VPN Gateway" },
                { "application gateway", "Azure Application Gateway" },
                { "load balancer", "Azure Load Balancer" },
                { "cdn", "Azure CDN" },
                { "cognitive services", "Azure Cognitive Services" },
                { "machine learning", "Azure Machine Learning" },
                { "container instances", "Azure Container Instances" },
                { "kubernetes", "Azure Kubernetes Service" },
                { "aks", "Azure Kubernetes Service" },
                { "functions", "Azure Functions" },
                { "logic apps", "Azure Logic Apps" },
                { "service bus", "Azure Service Bus" },
                { "event hubs", "Azure Event Hubs" },
                { "devops", "Azure DevOps" },
                { "dev ops", "Azure DevOps" },
                { "monitor", "Azure Monitor" },
                { "log analytics", "Azure Log Analytics" },
                { "backup", "Azure Backup" },
                { "site recovery", "Azure Site Recovery" },
                { "data factory", "Azure Data Factory" },
                { "synapse", "Azure Synapse Analytics" },
                { "databricks", "Azure Databricks" },
                { "purview", "Azure Purview" },
                { "sentinel", "Azure Sentinel" },
                { "security center", "Azure Security Center" },
                { "defender", "Microsoft Defender for Cloud" },
                { "front door", "Azure Front Door" },
                { "dns", "Azure DNS" },
                { "traffic manager", "Azure Traffic Manager" },
                { "expressroute", "Azure ExpressRoute" },
                { "batch", "Azure Batch" },
                { "automation", "Azure Automation" },
                { "api management", "Azure API Management" },
                { "redis", "Azure Cache for Redis" },
                { "search", "Azure Cognitive Search" },
                { "bot service", "Azure Bot Service" },
                { "signalr", "Azure SignalR Service" },
                { "notification hubs", "Azure Notification Hubs" },
                { "iot hub", "Azure IoT Hub" },
                { "stream analytics", "Azure Stream Analytics" },
                { "media services", "Azure Media Services" },
                { "video indexer", "Azure Video Indexer" },
                { "data lake", "Azure Data Lake" },
                { "data share", "Azure Data Share" },
                { "digital twins", "Azure Digital Twins" },
                { "spatial anchors", "Azure Spatial Anchors" },
                { "mixed reality", "Azure Mixed Reality" },
                { "remote rendering", "Azure Remote Rendering" },
                { "orbital", "Azure Orbital" },
                { "quantum", "Azure Quantum" },
                { "stack", "Azure Stack" },
                { "arc", "Azure Arc" },
            };

            foreach (var kvp in azureServiceKeywords)
            {
                if (normalized.Contains(kvp.Key, StringComparison.OrdinalIgnoreCase))
                {
                    services.Add(kvp.Value);
                }
            }

            // Try to extract service from title pattern: "Service Name - Issue Description"
            if (title?.Contains('-') == true)
            {
                var parts = title.Split('-', 2);
                if (parts.Length >= 2)
                {
                    var candidate = parts[0].Trim();
                    if (!string.IsNullOrWhiteSpace(candidate) && candidate.Length > 2 && !services.Contains(candidate))
                    {
                        services.Add(candidate);
                    }
                }
            }

            return services.Count > 0
                ? services.Distinct(StringComparer.OrdinalIgnoreCase).Take(10).ToArray()
                : ["Azure"];
        }

        private static string? InferAzureRegion(string? title, string? description)
        {
            var text = string.Join(" ", new[] { title, description }.Where(x => !string.IsNullOrWhiteSpace(x)));
            if (string.IsNullOrWhiteSpace(text))
            {
                return null;
            }

            var normalized = text.ToLowerInvariant();

            // Azure region names
            var azureRegions = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                { "east us", "East US" },
                { "east us 2", "East US 2" },
                { "west us", "West US" },
                { "west us 2", "West US 2" },
                { "west us 3", "West US 3" },
                { "central us", "Central US" },
                { "north central us", "North Central US" },
                { "south central us", "South Central US" },
                { "west central us", "West Central US" },
                { "brazil south", "Brazil South" },
                { "brazil southeast", "Brazil Southeast" },
                { "canada central", "Canada Central" },
                { "canada east", "Canada East" },
                { "north europe", "North Europe" },
                { "west europe", "West Europe" },
                { "uk south", "UK South" },
                { "uk west", "UK West" },
                { "france central", "France Central" },
                { "france south", "France South" },
                { "germany west central", "Germany West Central" },
                { "germany north", "Germany North" },
                { "switzerland north", "Switzerland North" },
                { "switzerland west", "Switzerland West" },
                { "norway east", "Norway East" },
                { "norway west", "Norway West" },
                { "sweden central", "Sweden Central" },
                { "sweden south", "Sweden South" },
                { "poland central", "Poland Central" },
                { "italy north", "Italy North" },
                { "spain central", "Spain Central" },
                { "east asia", "East Asia" },
                { "southeast asia", "Southeast Asia" },
                { "australia east", "Australia East" },
                { "australia southeast", "Australia Southeast" },
                { "australia central", "Australia Central" },
                { "japan east", "Japan East" },
                { "japan west", "Japan West" },
                { "korea central", "Korea Central" },
                { "korea south", "Korea South" },
                { "india central", "Central India" },
                { "india south", "South India" },
                { "india west", "West India" },
                { "central india", "Central India" },
                { "south india", "South India" },
                { "west india", "West India" },
                { "uaenorth", "UAE North" },
                { "uaecentral", "UAE Central" },
                { "qatar central", "Qatar Central" },
                { "israel central", "Israel Central" },
                { "south africa north", "South Africa North" },
                { "south africa west", "South Africa West" },
            };

            foreach (var kvp in azureRegions)
            {
                if (normalized.Contains(kvp.Key, StringComparison.OrdinalIgnoreCase))
                {
                    return kvp.Value;
                }
            }

            return null;
        }
    }
}
