using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Domain.Enums;
using MonitoringPlatform.Infrastructure.Repositories;
using MonitoringPlatform.UnitTests.TestHelpers;

namespace MonitoringPlatform.UnitTests.Repositories;

public class CloudStatusRepositoryTests
{
    [Fact]
    public async Task GetOverviewAsync_ShouldReturnSummaryProvidersAndFilteredIncidents()
    {
        using var factory = new SqliteTestDbContextFactory();
        await using var context = factory.CreateDbContext();

        var now = new DateTime(2026, 5, 24, 12, 0, 0, DateTimeKind.Utc);
        var tenantId = Guid.NewGuid();
        var cloudflareId = Guid.NewGuid();
        var githubId = Guid.NewGuid();
        context.Tenants.Add(new Tenant
        {
            Id = tenantId,
            Name = "Cloud Workspace",
            Slug = "cloud-workspace",
            CreatedAtUtc = now,
        });

        context.CloudProviders.AddRange(
            new CloudProvider
            {
                Id = cloudflareId,
                TenantId = tenantId,
                Name = "Cloudflare",
                Slug = "cloudflare",
                LogoUrl = "https://cdn.simpleicons.org/cloudflare/F38020",
                SourceType = CloudStatusSourceType.StatuspageApi,
                SourceUrl = "https://www.cloudflarestatus.com/api/v2/incidents.json",
                StatusPageUrl = "https://www.cloudflarestatus.com",
                IsEnabled = true,
                CreatedAt = now.AddDays(-10),
                UpdatedAt = now.AddMinutes(-10),
                LastSyncedAt = now.AddMinutes(-5),
            },
            new CloudProvider
            {
                Id = githubId,
                TenantId = tenantId,
                Name = "GitHub",
                Slug = "github",
                LogoUrl = "https://cdn.simpleicons.org/github/181717",
                SourceType = CloudStatusSourceType.StatuspageApi,
                SourceUrl = "https://www.githubstatus.com/api/v2/incidents.json",
                StatusPageUrl = "https://www.githubstatus.com",
                IsEnabled = true,
                CreatedAt = now.AddDays(-10),
                UpdatedAt = now.AddMinutes(-9),
                LastSyncedAt = now.AddMinutes(-3),
            });

        context.CloudIncidents.AddRange(
            new CloudIncident
            {
                Id = Guid.NewGuid(),
                CloudProviderId = cloudflareId,
                ExternalId = "cf-1",
                Title = "API errors",
                Description = "Cloudflare API elevated errors",
                Severity = CloudIncidentSeverity.Critical,
                Status = CloudIncidentStatus.Investigating,
                Region = "Global",
                AffectedServicesJson = "[\"API\"]",
                Source = "Statuspage API",
                OfficialUrl = "https://example.com/cf-1",
                IsActive = true,
                OccurredAt = now.AddHours(-2),
                LastUpdatedAt = now.AddHours(-1),
                CreatedAt = now.AddHours(-2),
                UpdatedAt = now.AddHours(-1),
            },
            new CloudIncident
            {
                Id = Guid.NewGuid(),
                CloudProviderId = githubId,
                ExternalId = "gh-1",
                Title = "Actions degradation",
                Description = "Jobs are delayed",
                Severity = CloudIncidentSeverity.Major,
                Status = CloudIncidentStatus.Monitoring,
                Region = null,
                AffectedServicesJson = "[\"Actions\"]",
                Source = "Statuspage API",
                OfficialUrl = "https://example.com/gh-1",
                IsActive = true,
                OccurredAt = now.AddHours(-3),
                LastUpdatedAt = now.AddHours(-2),
                CreatedAt = now.AddHours(-3),
                UpdatedAt = now.AddHours(-2),
            },
            new CloudIncident
            {
                Id = Guid.NewGuid(),
                CloudProviderId = githubId,
                ExternalId = "gh-2",
                Title = "Webhooks restored",
                Description = "Resolved incident",
                Severity = CloudIncidentSeverity.Minor,
                Status = CloudIncidentStatus.Resolved,
                Region = null,
                AffectedServicesJson = "[\"Webhooks\"]",
                Source = "Statuspage API",
                OfficialUrl = "https://example.com/gh-2",
                IsActive = false,
                OccurredAt = now.AddDays(-1),
                LastUpdatedAt = now.AddDays(-1).AddMinutes(20),
                ResolvedAt = now.AddDays(-1).AddMinutes(20),
                CreatedAt = now.AddDays(-1),
                UpdatedAt = now.AddDays(-1).AddMinutes(20),
            });

        await context.SaveChangesAsync();
        var currentUser = new TestCurrentUserContext(tenantId);
        var repository = new CloudStatusRepository(context, currentUser);

        var overview = await repository.GetOverviewAsync(new CloudStatusQueryDto
        {
            Provider = "github",
            ActiveOnly = true,
            Take = 20,
        });

        Assert.Single(overview.Providers);
        Assert.Equal("github", overview.Providers[0].Slug);
        Assert.Single(overview.Incidents);
        Assert.Equal("Actions degradation", overview.Incidents[0].Title);
        Assert.Equal(1, overview.Summary.TotalProviders);
        Assert.Equal(1, overview.Summary.ActiveIncidents);
        Assert.Equal(0, overview.Summary.CriticalOutages);
        Assert.Equal(0, overview.Summary.OperationalServices);
    }
}
