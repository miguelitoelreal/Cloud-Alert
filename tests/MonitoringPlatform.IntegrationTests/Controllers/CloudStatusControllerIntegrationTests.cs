using System.Net.Http.Json;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Domain.Enums;
using MonitoringPlatform.IntegrationTests.TestHelpers;

namespace MonitoringPlatform.IntegrationTests.Controllers;

public class CloudStatusControllerIntegrationTests
{
    [Fact]
    public async Task GetOverview_ShouldReturnCloudProvidersAndIncidents()
    {
        await using var factory = new ApiWebApplicationFactory();
        await factory.ResetDatabaseAsync();

        var providerId = Guid.NewGuid();
        var now = new DateTime(2026, 5, 24, 14, 0, 0, DateTimeKind.Utc);

        await factory.SeedAsync(
            new CloudProvider
            {
                Id = providerId,
                Name = "OpenAI",
                Slug = "openai",
                LogoUrl = "https://cdn.simpleicons.org/openai/412991",
                SourceType = CloudStatusSourceType.JsonApi,
                SourceUrl = "https://status.openai.com/api/v2/incidents.json",
                StatusPageUrl = "https://status.openai.com",
                IsEnabled = true,
                CreatedAt = now.AddDays(-2),
                UpdatedAt = now.AddMinutes(-5),
                LastSyncedAt = now.AddMinutes(-5),
            },
            new CloudIncident
            {
                Id = Guid.NewGuid(),
                CloudProviderId = providerId,
                ExternalId = "oa-1",
                Title = "Realtime API issue",
                Description = "Realtime API degraded",
                Severity = CloudIncidentSeverity.Major,
                Status = CloudIncidentStatus.Investigating,
                Region = "Europe",
                AffectedServicesJson = "[\"Realtime API\"]",
                Source = "JSON API",
                OfficialUrl = "https://status.openai.com/incidents/oa-1",
                IsActive = true,
                OccurredAt = now.AddHours(-1),
                LastUpdatedAt = now.AddMinutes(-30),
                CreatedAt = now.AddHours(-1),
                UpdatedAt = now.AddMinutes(-30),
            });

        var (client, _) = await factory.CreateAuthenticatedClientAsync(
            email: "cloud-status@example.com");
        var response = await client.GetAsync("/api/cloud-status/overview?activeOnly=true&take=10");

        response.EnsureSuccessStatusCode();
        var overview = await response.Content.ReadFromJsonAsync<CloudStatusOverviewDto>();

        Assert.NotNull(overview);
        Assert.Single(overview!.Providers);
        Assert.Single(overview.Incidents);
        Assert.Equal("OpenAI", overview.Incidents[0].ProviderName);
        Assert.Equal("Realtime API issue", overview.Incidents[0].Title);
        Assert.Equal(1, overview.Summary.ActiveIncidents);
        Assert.Equal(1, overview.Summary.TotalProviders);
    }
}
