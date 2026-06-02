using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Infrastructure.Repositories;
using MonitoringPlatform.UnitTests.TestHelpers;
using DomainMonitor = MonitoringPlatform.Domain.Entities.Monitor;

namespace MonitoringPlatform.UnitTests.Repositories;

public class DashboardRepositoryTests
{
    [Fact]
    public async Task GetMonitorSummariesAsync_ShouldCalculateUptimeAndUseLatestLogData()
    {
        // Arrange
        using var factory = new SqliteTestDbContextFactory();
        await using var context = factory.CreateDbContext();

        var alphaId = Guid.NewGuid();
        var betaId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var now = new DateTime(2026, 5, 23, 14, 0, 0, DateTimeKind.Utc);
        context.Tenants.Add(new Tenant
        {
            Id = tenantId,
            Name = "Dashboard Workspace",
            Slug = "dashboard-workspace",
            CreatedAtUtc = now,
        });

        context.Monitors.AddRange(
            new DomainMonitor
            {
                Id = alphaId,
                TenantId = tenantId,
                Name = "Alpha API",
                Url = "https://alpha.example.com/health",
                IntervalInSeconds = 60,
                Status = MonitorStatus.Unknown,
                CreatedAt = now.AddHours(-2),
                UpdatedAt = now.AddHours(-2),
            },
            new DomainMonitor
            {
                Id = betaId,
                TenantId = tenantId,
                Name = "Beta API",
                Url = "https://beta.example.com/health",
                IntervalInSeconds = 60,
                Status = MonitorStatus.Unknown,
                CreatedAt = now.AddHours(-2),
                UpdatedAt = now.AddHours(-2),
            });

        context.MonitorLogs.AddRange(
            new MonitorLog
            {
                Id = Guid.NewGuid(),
                MonitorId = alphaId,
                Status = MonitorStatus.Online,
                StatusCode = 200,
                ResponseTimeMs = 80,
                CheckedAt = now.AddMinutes(-10),
            },
            new MonitorLog
            {
                Id = Guid.NewGuid(),
                MonitorId = alphaId,
                Status = MonitorStatus.Offline,
                StatusCode = 500,
                ResponseTimeMs = 350,
                CheckedAt = now.AddMinutes(-5),
                ErrorMessage = "Internal error",
            });

        await context.SaveChangesAsync();
        var repository = new DashboardRepository(context, new TestCurrentUserContext(tenantId));

        // Act
        var result = await repository.GetMonitorSummariesAsync();

        // Assert
        Assert.Equal(2, result.Count);

        var alpha = result.Single(x => x.Id == alphaId);
        Assert.Equal((int)MonitorStatus.Offline, alpha.CurrentStatus);
        Assert.Equal(now.AddMinutes(-5), alpha.LastCheckedAt);
        Assert.Equal(350, alpha.LastResponseTimeMs);
        Assert.Equal(2, alpha.TotalChecks);
        Assert.Equal(1, alpha.FailedChecks);
        Assert.Equal(50d, alpha.UptimePercentage);

        var beta = result.Single(x => x.Id == betaId);
        Assert.Equal((int)MonitorStatus.Unknown, beta.CurrentStatus);
        Assert.Null(beta.LastCheckedAt);
        Assert.Equal(0, beta.TotalChecks);
        Assert.Equal(0, beta.FailedChecks);
        Assert.Null(beta.UptimePercentage);
    }
}
