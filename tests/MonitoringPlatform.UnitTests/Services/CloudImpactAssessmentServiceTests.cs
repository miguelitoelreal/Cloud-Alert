using MonitoringPlatform.API.Services;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Domain.Enums;
using MonitoringPlatform.Infrastructure.Persistence;
using MonitoringPlatform.Infrastructure.Repositories;
using MonitoringPlatform.UnitTests.TestHelpers;
using Xunit;

namespace MonitoringPlatform.UnitTests.Services;

public class CloudImpactAssessmentServiceTests
{
    [Fact]
    public async Task AssessImpactAsync_ShouldDetectProviderMatch()
    {
        using var dbFactory = new SqliteTestDbContextFactory();
        await using var context = dbFactory.CreateDbContext();
        var now = DateTime.UtcNow;
        var tenantId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        var incidentId = Guid.NewGuid();
        var monitorId = Guid.NewGuid();

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
        context.CloudIncidents.Add(new CloudIncident
        {
            Id = incidentId,
            CloudProviderId = providerId,
            ExternalId = "aws-1",
            Title = "EC2 outage",
            Description = "Desc",
            Severity = CloudIncidentSeverity.Critical,
            Status = CloudIncidentStatus.Investigating,
            Region = "us-east-1",
            AffectedServicesJson = "[\"EC2\"]",
            Source = "S",
            OfficialUrl = "https://example.com",
            IsActive = true,
            OccurredAt = now,
            LastUpdatedAt = now,
            CreatedAt = now,
            UpdatedAt = now,
        });
        context.Monitors.Add(new MonitoringPlatform.Domain.Entities.Monitor
        {
            Id = monitorId,
            TenantId = tenantId,
            Name = "AWS API Monitor",
            Url = "https://aws.amazon.com/api",
            IntervalInSeconds = 60,
            Status = MonitorStatus.Online,
            CreatedAt = now,
            UpdatedAt = now,
        });
        await context.SaveChangesAsync();

        var impactRepo = new CloudIncidentImpactRepository(context);
        var service = new CloudImpactAssessmentService(context, impactRepo);
        var impacts = await service.AssessImpactAsync(tenantId, incidentId);

        Assert.NotEmpty(impacts);
        Assert.All(impacts, i => Assert.True(i.ImpactLevel > ImpactLevel.None));
    }

    [Fact]
    public async Task AssessImpactAsync_ShouldReturnEmpty_WhenNoMatch()
    {
        using var dbFactory = new SqliteTestDbContextFactory();
        await using var context = dbFactory.CreateDbContext();
        var now = DateTime.UtcNow;
        var tenantId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        var incidentId = Guid.NewGuid();
        var monitorId = Guid.NewGuid();

        context.Tenants.Add(new Tenant { Id = tenantId, Name = "T", Slug = "t", CreatedAtUtc = now });
        context.CloudProviders.Add(new CloudProvider
        {
            Id = providerId,
            TenantId = tenantId,
            Name = "Azure",
            Slug = "azure",
            LogoUrl = "https://example.com/azure.png",
            SourceType = CloudStatusSourceType.StatuspageApi,
            SourceUrl = "https://status.azure.com",
            IsEnabled = true,
            CreatedAt = now,
            UpdatedAt = now,
        });
        context.CloudIncidents.Add(new CloudIncident
        {
            Id = incidentId,
            CloudProviderId = providerId,
            ExternalId = "az-1",
            Title = "Azure VM issue",
            Description = "Desc",
            Severity = CloudIncidentSeverity.Critical,
            Status = CloudIncidentStatus.Investigating,
            Region = "west-us",
            AffectedServicesJson = "[\"VM\"]",
            Source = "S",
            OfficialUrl = "https://example.com",
            IsActive = true,
            OccurredAt = now,
            LastUpdatedAt = now,
            CreatedAt = now,
            UpdatedAt = now,
        });
        context.Monitors.Add(new MonitoringPlatform.Domain.Entities.Monitor
        {
            Id = monitorId,
            TenantId = tenantId,
            Name = "GitHub API",
            Url = "https://api.github.com",
            IntervalInSeconds = 60,
            Status = MonitorStatus.Online,
            CreatedAt = now,
            UpdatedAt = now,
        });
        await context.SaveChangesAsync();

        var impactRepo = new CloudIncidentImpactRepository(context);
        var service = new CloudImpactAssessmentService(context, impactRepo);
        var impacts = await service.AssessImpactAsync(tenantId, incidentId);

        Assert.Empty(impacts);
    }
}
