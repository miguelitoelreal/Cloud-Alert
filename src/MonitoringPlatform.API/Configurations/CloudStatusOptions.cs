using System.Text.Json;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Domain.Enums;

namespace MonitoringPlatform.API.Configurations
{
    public class CloudStatusOptions
    {
        public bool Enabled { get; set; } = true;
        public int IntervalSeconds { get; set; } = 300;
        public int HttpTimeoutSeconds { get; set; } = 20;
        public List<CloudStatusProviderOptions> Providers { get; set; } = [];

        public IReadOnlyCollection<CloudProviderSeedDto> ToSeedDtos()
        {
            return Providers.Select(x => new CloudProviderSeedDto
            {
                Name = x.Name,
                Slug = x.Slug,
                LogoUrl = x.LogoUrl,
                SourceType = x.SourceType,
                SourceUrl = x.SourceUrl,
                StatusPageUrl = x.StatusPageUrl,
                MetadataJson = x.Metadata is not null
                    ? JsonSerializer.Serialize(x.Metadata)
                    : x.MetadataJson,
                IsEnabled = x.IsEnabled,
            }).ToArray();
        }
    }

    public class CloudStatusProviderOptions
    {
        public string Name { get; set; } = null!;
        public string Slug { get; set; } = null!;
        public string LogoUrl { get; set; } = null!;
        public CloudStatusSourceType SourceType { get; set; }
        public string SourceUrl { get; set; } = null!;
        public string? StatusPageUrl { get; set; }
        public string? MetadataJson { get; set; }
        public CloudStatusProviderMetadataOptions? Metadata { get; set; }
        public bool IsEnabled { get; set; } = true;
    }

    public class CloudStatusProviderMetadataOptions
    {
        public string[] ServiceNames { get; set; } = [];
        public string[] ServiceKeywords { get; set; } = [];
    }
}
