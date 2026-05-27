using MonitoringPlatform.API.Services;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Domain.Enums;
using MonitoringPlatform.Infrastructure.Persistence;
using MonitoringPlatform.Infrastructure.Repositories;
using MonitoringPlatform.UnitTests.TestHelpers;
using Xunit;

namespace MonitoringPlatform.UnitTests.Services;

public class CloudIncidentCorrelationServiceTests
{
    private static AppDbContext CreateContext(SqliteTestDbContextFactory factory)
    {
        var context = factory.CreateDbContext();
        return context;
    }

    [Fact]
    public async Task DetectAndGroupAsync_ShouldCorrelateIncidentsByRegionAndServices()
    {
        using var factory = new SqliteTestDbContextFactory();
        await using var context = CreateContext(factory);
        var now = DateTime.UtcNow;
        var tenantId = Guid.NewGuid();
        var providerId = Guid.NewGuid();

        context.Tenants.Add(new Tenant { Id = tenantId, Name = "T", Slug = "t", CreatedAtUtc = now });
        context.CloudProviders.Add(new CloudProvider
        {
            Id = providerId,
            TenantId = tenantId,
            Name = "AWS",
            Slug = "aws",
            LogoUrl = "https://example.com/aws.png",
            SourceType = CloudStatusSourceType.StatuspageApi,
            SourceUrl = "https://status.aws.amazon.com",
            IsEnabled = true,
            CreatedAt = now,
            UpdatedAt = now,
        });
        context.CloudIncidents.AddRange(
            new CloudIncident
            {
                Id = Guid.NewGuid(),
                CloudProviderId = providerId,
                ExternalId = "aws-1",
                Title = "EC2 outage in us-east-1",
                Description = "Desc",
                Severity = CloudIncidentSeverity.Critical,
                Status = CloudIncidentStatus.Investigating,
                Region = "us-east-1",
                AffectedServicesJson = "[\"EC2\",\"RDS\"]",
                Source = "S",
                OfficialUrl = "https://example.com",
                IsActive = true,
                OccurredAt = now.AddMinutes(-30),
                LastUpdatedAt = now,
                CreatedAt = now,
                UpdatedAt = now,
            },
            new CloudIncident
            {
                Id = Guid.NewGuid(),
                CloudProviderId = providerId,
                ExternalId = "aws-2",
                Title = "RDS degradation in us-east-1",
                Description = "Desc",
                Severity = CloudIncidentSeverity.Major,
                Status = CloudIncidentStatus.Investigating,
                Region = "us-east-1",
                AffectedServicesJson = "[\"RDS\",\"Lambda\"]",
                Source = "S",
                OfficialUrl = "https://example.com",
                IsActive = true,
                OccurredAt = now.AddMinutes(-20),
                LastUpdatedAt = now,
                CreatedAt = now,
                UpdatedAt = now,
            });
        await context.SaveChangesAsync();

        var currentUser = new TestCurrentUserContext(tenantId);
        var groupRepo = new CloudIncidentGroupRepository(context, currentUser);
        var service = new CloudIncidentCorrelationService(context, groupRepo);
        var groups = await service.DetectAndGroupAsync(tenantId);

        Assert.NotEmpty(groups);
        Assert.All(groups, g => Assert.True(g.Correlations.Count >= 2));
    }

    [Fact]
    public async Task DetectForRecentIncidentsAsync_ShouldCreateGroupsForRecentOnly()
    {
        using var factory = new SqliteTestDbContextFactory();
        await using var context = CreateContext(factory);
        var now = DateTime.UtcNow;
        var tenantId = Guid.NewGuid();
        var providerId = Guid.NewGuid();

        context.Tenants.Add(new Tenant { Id = tenantId, Name = "T", Slug = "t", CreatedAtUtc = now });
        context.CloudProviders.Add(new CloudProvider
        {
            Id = providerId,
            TenantId = tenantId,
            Name = "AWS",
            Slug = "aws",
            LogoUrl = "https://example.com/aws.png",
            SourceType = CloudStatusSourceType.StatuspageApi,
            SourceUrl = "https://status.aws.amazon.com",
            IsEnabled = true,
            CreatedAt = now,
            UpdatedAt = now,
        });
        context.CloudIncidents.AddRange(
            new CloudIncident
            {
                Id = Guid.NewGuid(),
                CloudProviderId = providerId,
                ExternalId = "old-1",
                Title = "Old incident",
                Description = "Desc",
                Severity = CloudIncidentSeverity.Critical,
                Status = CloudIncidentStatus.Resolved,
                Region = "us-east-1",
                AffectedServicesJson = "[\"EC2\"]",
                Source = "S",
                OfficialUrl = "https://example.com",
                IsActive = false,
                OccurredAt = now.AddDays(-2),
                LastUpdatedAt = now.AddDays(-2),
                CreatedAt = now.AddDays(-2),
                UpdatedAt = now.AddDays(-2),
            },
            new CloudIncident
            {
                Id = Guid.NewGuid(),
                CloudProviderId = providerId,
                ExternalId = "new-1",
                Title = "EC2 issue",
                Description = "Desc",
                Severity = CloudIncidentSeverity.Critical,
                Status = CloudIncidentStatus.Investigating,
                Region = "us-east-1",
                AffectedServicesJson = "[\"EC2\"]",
                Source = "S",
                OfficialUrl = "https://example.com",
                IsActive = true,
                OccurredAt = now.AddMinutes(-10),
                LastUpdatedAt = now,
                CreatedAt = now.AddMinutes(-10),
                UpdatedAt = now.AddMinutes(-10),
            },
            new CloudIncident
            {
                Id = Guid.NewGuid(),
                CloudProviderId = providerId,
                ExternalId = "new-2",
                Title = "EC2 problem",
                Description = "Desc",
                Severity = CloudIncidentSeverity.Major,
                Status = CloudIncidentStatus.Investigating,
                Region = "us-east-1",
                AffectedServicesJson = "[\"EC2\"]",
                Source = "S",
                OfficialUrl = "https://example.com",
                IsActive = true,
                OccurredAt = now.AddMinutes(-5),
                LastUpdatedAt = now,
                CreatedAt = now.AddMinutes(-5),
                UpdatedAt = now.AddMinutes(-5),
            });
        await context.SaveChangesAsync();

        var currentUser = new TestCurrentUserContext(tenantId);
        var groupRepo = new CloudIncidentGroupRepository(context, currentUser);
        var service = new CloudIncidentCorrelationService(context, groupRepo);
        await service.DetectForRecentIncidentsAsync();

        var groups = await service.GetActiveGroupsAsync(tenantId);
        Assert.NotEmpty(groups);
    }
}
