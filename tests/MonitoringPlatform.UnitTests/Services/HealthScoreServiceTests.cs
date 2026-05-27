using MonitoringPlatform.API.Services;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Domain.Enums;
using MonitoringPlatform.Infrastructure.Persistence;
using MonitoringPlatform.UnitTests.TestHelpers;
using Xunit;

namespace MonitoringPlatform.UnitTests.Services;

public class HealthScoreServiceTests
{
    [Fact]
    public async Task CalculateTenantScoreAsync_NoMonitors_Returns100()
    {
        using var dbFactory = new SqliteTestDbContextFactory();
        await using var context = dbFactory.CreateDbContext();
        var now = DateTime.UtcNow;
        var tenantId = Guid.NewGuid();
        context.Tenants.Add(new Tenant { Id = tenantId, Name = "T", Slug = "t", CreatedAtUtc = now });
        await context.SaveChangesAsync();

        var service = new HealthScoreService(context);
        var score = await service.CalculateTenantScoreAsync(tenantId);

        Assert.Equal(100m, score);
    }

    [Fact]
    public async Task CalculateTenantScoreAsync_AllOnline_ReturnsHighScore()
    {
        using var dbFactory = new SqliteTestDbContextFactory();
        await using var context = dbFactory.CreateDbContext();
        var now = DateTime.UtcNow;
        var tenantId = Guid.NewGuid();
        context.Tenants.Add(new Tenant { Id = tenantId, Name = "T", Slug = "t", CreatedAtUtc = now });
        context.Monitors.Add(new MonitoringPlatform.Domain.Entities.Monitor
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "API",
            Url = "https://api.example.com",
            IntervalInSeconds = 60,
            Status = MonitorStatus.Online,
            CreatedAt = now,
            UpdatedAt = now,
        });
        await context.SaveChangesAsync();

        var service = new HealthScoreService(context);
        var score = await service.CalculateTenantScoreAsync(tenantId);

        Assert.True(score > 80m);
    }

    [Fact]
    public async Task CalculateTenantScoreAsync_OfflineMonitor_ReducesScore()
    {
        using var dbFactory = new SqliteTestDbContextFactory();
        await using var context = dbFactory.CreateDbContext();
        var now = DateTime.UtcNow;
        var tenantId = Guid.NewGuid();
        context.Tenants.Add(new Tenant { Id = tenantId, Name = "T", Slug = "t", CreatedAtUtc = now });
        context.Monitors.Add(new MonitoringPlatform.Domain.Entities.Monitor
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "API",
            Url = "https://api.example.com",
            IntervalInSeconds = 60,
            Status = MonitorStatus.Offline,
            CreatedAt = now,
            UpdatedAt = now,
        });
        await context.SaveChangesAsync();

        var service = new HealthScoreService(context);
        var score = await service.CalculateTenantScoreAsync(tenantId);

        Assert.True(score < 100m);
    }
}
