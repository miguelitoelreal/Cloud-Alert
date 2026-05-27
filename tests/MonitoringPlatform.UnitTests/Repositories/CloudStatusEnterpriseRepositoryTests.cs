using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Domain.Enums;
using MonitoringPlatform.Infrastructure.Repositories;
using MonitoringPlatform.UnitTests.TestHelpers;

namespace MonitoringPlatform.UnitTests.Repositories;

public class CloudStatusEnterpriseRepositoryTests
{
    [Fact]
    public async Task CloudIncidentEventRepository_ShouldAddAndRetrieveEvents()
    {
        using var factory = new SqliteTestDbContextFactory();
        await using var context = factory.CreateDbContext();

        var now = DateTime.UtcNow;
        var tenantId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        var incidentId = Guid.NewGuid();

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
            Title = "Test",
            Description = "Desc",
            Severity = CloudIncidentSeverity.Critical,
            Status = CloudIncidentStatus.Investigating,
            Source = "S",
            OfficialUrl = "https://example.com",
            IsActive = true,
            OccurredAt = now,
            LastUpdatedAt = now,
            CreatedAt = now,
            UpdatedAt = now,
        });
        await context.SaveChangesAsync();

        var repo = new CloudIncidentEventRepository(context);
        await repo.AddAsync(new CloudIncidentEvent
        {
            Id = Guid.NewGuid(),
            CloudIncidentId = incidentId,
            PreviousStatus = CloudIncidentStatus.Investigating,
            NewStatus = CloudIncidentStatus.Identified,
            EventDescription = "Status changed",
            OccurredAt = now,
            CreatedAt = now,
        });

        var events = await repo.GetByIncidentIdAsync(incidentId);
        Assert.Single(events);
        Assert.Equal(CloudIncidentStatus.Identified, events[0].NewStatus);
    }

    [Fact]
    public async Task CloudStatusEventLogRepository_ShouldAddAndRetrieveByType()
    {
        using var factory = new SqliteTestDbContextFactory();
        await using var context = factory.CreateDbContext();

        var now = DateTime.UtcNow;
        var tenantId = Guid.NewGuid();
        context.Tenants.Add(new Tenant { Id = tenantId, Name = "T", Slug = "t", CreatedAtUtc = now });
        await context.SaveChangesAsync();

        var repo = new CloudStatusEventLogRepository(context);
        await repo.AddAsync(new CloudStatusEventLog
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            EventType = CloudStatusEventType.IncidentCreated,
            OccurredAt = now,
            CreatedAt = now,
        });
        await repo.AddAsync(new CloudStatusEventLog
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            EventType = CloudStatusEventType.CorrelationDetected,
            OccurredAt = now,
            CreatedAt = now,
        });

        var all = await repo.GetByTenantAsync(tenantId);
        Assert.Equal(2, all.Count);

        var filtered = await repo.GetByTenantAndTypeAsync(tenantId, CloudStatusEventType.IncidentCreated);
        Assert.Single(filtered);
    }

    [Fact]
    public async Task CloudAlertSubscriptionRepository_ShouldSoftDelete()
    {
        using var factory = new SqliteTestDbContextFactory();
        await using var context = factory.CreateDbContext();

        var now = DateTime.UtcNow;
        var tenantId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        context.Tenants.Add(new Tenant { Id = tenantId, Name = "T", Slug = "t", CreatedAtUtc = now });
        await context.SaveChangesAsync();

        var currentUser = new TestCurrentUserContext(tenantId, userId);
        var repo = new CloudAlertSubscriptionRepository(context, currentUser);
        var sub = new CloudAlertSubscription
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            UserId = userId,
            Name = "Test Sub",
            MinSeverity = CloudIncidentSeverity.Critical,
            CreatedAt = now,
            UpdatedAt = now,
        };
        await repo.AddAsync(sub);

        var before = await repo.GetByIdAsync(sub.Id);
        Assert.NotNull(before);
        Assert.False(before.IsDeleted);

        await repo.SoftDeleteAsync(sub.Id);

        var after = await repo.GetByIdAsync(sub.Id);
        Assert.Null(after);
    }

    [Fact]
    public async Task TenantStatusPageSettingsRepository_ShouldEnforceSlugUniqueness()
    {
        using var factory = new SqliteTestDbContextFactory();
        await using var context = factory.CreateDbContext();

        var now = DateTime.UtcNow;
        var tenantId = Guid.NewGuid();
        context.Tenants.Add(new Tenant { Id = tenantId, Name = "T", Slug = "t", CreatedAtUtc = now });
        await context.SaveChangesAsync();

        var currentUser = new TestCurrentUserContext(tenantId);
        var repo = new TenantStatusPageSettingsRepository(context, currentUser);
        await repo.AddAsync(new TenantStatusPageSettings
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Slug = "my-status",
            IsEnabled = true,
            CreatedAt = now,
            UpdatedAt = now,
        });

        var found = await repo.GetBySlugAsync("my-status");
        Assert.NotNull(found);
        Assert.Equal(tenantId, found.TenantId);
    }

    [Fact]
    public async Task SlaDefinitionRepository_ShouldCreateAndSoftDelete()
    {
        using var factory = new SqliteTestDbContextFactory();
        await using var context = factory.CreateDbContext();

        var now = DateTime.UtcNow;
        var tenantId = Guid.NewGuid();
        context.Tenants.Add(new Tenant { Id = tenantId, Name = "T", Slug = "t", CreatedAtUtc = now });
        await context.SaveChangesAsync();

        var currentUser = new TestCurrentUserContext(tenantId);
        var repo = new SlaDefinitionRepository(context, currentUser);
        var def = new SlaDefinition
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "99.9% SLA",
            TargetUptimePercent = 99.9m,
            MeasurementWindowDays = 30,
            CreatedAt = now,
            UpdatedAt = now,
        };
        await repo.AddAsync(def);

        var all = await repo.GetByTenantAsync(tenantId);
        Assert.Single(all);

        await repo.SoftDeleteAsync(def.Id);
        var after = await repo.GetByTenantAsync(tenantId);
        Assert.Empty(after);
    }

    [Fact]
    public async Task ServiceDependencyRepository_ShouldTrackDependencies()
    {
        using var factory = new SqliteTestDbContextFactory();
        await using var context = factory.CreateDbContext();

        var now = DateTime.UtcNow;
        var tenantId = Guid.NewGuid();
        var sourceId = Guid.NewGuid();
        var targetId = Guid.NewGuid();

        context.Tenants.Add(new Tenant { Id = tenantId, Name = "T", Slug = "t", CreatedAtUtc = now });
        context.Monitors.AddRange(
            new MonitoringPlatform.Domain.Entities.Monitor
            {
                Id = sourceId,
                TenantId = tenantId,
                Name = "API",
                Url = "https://api.example.com",
                IntervalInSeconds = 60,
                Status = MonitorStatus.Online,
                CreatedAt = now,
                UpdatedAt = now,
            },
            new MonitoringPlatform.Domain.Entities.Monitor
            {
                Id = targetId,
                TenantId = tenantId,
                Name = "DB",
                Url = "https://db.example.com",
                IntervalInSeconds = 60,
                Status = MonitorStatus.Online,
                CreatedAt = now,
                UpdatedAt = now,
            });
        await context.SaveChangesAsync();

        var currentUser = new TestCurrentUserContext(tenantId);
        var repo = new ServiceDependencyRepository(context, currentUser);
        await repo.AddAsync(new ServiceDependency
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SourceMonitorId = sourceId,
            TargetMonitorId = targetId,
            DependencyType = DependencyType.DependsOn,
            CreatedAt = now,
            UpdatedAt = now,
        });

        var bySource = await repo.GetBySourceMonitorAsync(sourceId);
        Assert.Single(bySource);

        var byTarget = await repo.GetByTargetMonitorAsync(targetId);
        Assert.Single(byTarget);
    }
}
