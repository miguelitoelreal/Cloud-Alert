using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Infrastructure.Repositories;
using MonitoringPlatform.UnitTests.TestHelpers;
using DomainMonitor = MonitoringPlatform.Domain.Entities.Monitor;

namespace MonitoringPlatform.UnitTests.Repositories;

public class MonitorExecutionRepositoryTests
{
    [Fact]
    public async Task GetDueMonitorsAsync_ShouldReturnOnlyDueMonitors_AndSkipExcludedIds()
    {
        // Arrange
        using var factory = new SqliteTestDbContextFactory();
        await using var context = factory.CreateDbContext();
        var tenantId = Guid.NewGuid();
        context.Tenants.Add(new Tenant
        {
            Id = tenantId,
            Name = "Execution Workspace",
            Slug = "execution-workspace",
            CreatedAtUtc = DateTime.UtcNow,
        });

        var dueMonitor = new DomainMonitor
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Due monitor",
            Url = "https://due.example.com/health",
            IntervalInSeconds = 60,
            Status = MonitorStatus.Unknown,
            CreatedAt = DateTime.UtcNow.AddHours(-1),
            UpdatedAt = DateTime.UtcNow.AddHours(-1),
        };

        var recentMonitor = new DomainMonitor
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Recent monitor",
            Url = "https://recent.example.com/health",
            IntervalInSeconds = 120,
            Status = MonitorStatus.Online,
            CreatedAt = DateTime.UtcNow.AddHours(-1),
            UpdatedAt = DateTime.UtcNow.AddHours(-1),
        };

        var excludedMonitor = new DomainMonitor
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Excluded monitor",
            Url = "https://excluded.example.com/health",
            IntervalInSeconds = 60,
            Status = MonitorStatus.Online,
            CreatedAt = DateTime.UtcNow.AddHours(-1),
            UpdatedAt = DateTime.UtcNow.AddHours(-1),
        };

        var now = new DateTime(2026, 5, 23, 12, 0, 0, DateTimeKind.Utc);

        context.Monitors.AddRange(dueMonitor, recentMonitor, excludedMonitor);
        context.MonitorLogs.AddRange(
            new MonitorLog
            {
                Id = Guid.NewGuid(),
                MonitorId = recentMonitor.Id,
                Status = MonitorStatus.Online,
                CheckedAt = now.AddSeconds(-30),
                ResponseTimeMs = 110,
            },
            new MonitorLog
            {
                Id = Guid.NewGuid(),
                MonitorId = excludedMonitor.Id,
                Status = MonitorStatus.Online,
                CheckedAt = now.AddMinutes(-5),
                ResponseTimeMs = 120,
            });

        await context.SaveChangesAsync();
        var repository = new MonitorExecutionRepository(context);

        // Act
        var result = await repository.GetDueMonitorsAsync(now, new[] { excludedMonitor.Id }, CancellationToken.None);

        // Assert
        Assert.Single(result);
        Assert.Equal(dueMonitor.Id, result[0].Id);
        Assert.Equal("Due monitor", result[0].Name);
    }

    [Fact]
    public async Task RecordCheckResultAsync_ShouldPersistLogUpdateStatusAndReturnAggregatedMetrics()
    {
        // Arrange
        using var factory = new SqliteTestDbContextFactory();
        var tenantId = Guid.NewGuid();
        var monitorId = Guid.NewGuid();
        var checkedAt = new DateTime(2026, 5, 23, 13, 0, 0, DateTimeKind.Utc);

        await using (var setupContext = factory.CreateDbContext())
        {
            setupContext.Tenants.Add(new Tenant
            {
                Id = tenantId,
                Name = "Execution Workspace",
                Slug = "execution-workspace",
                CreatedAtUtc = DateTime.UtcNow,
            });
            setupContext.Monitors.Add(new DomainMonitor
            {
                Id = monitorId,
                TenantId = tenantId,
                Name = "API principal",
                Url = "https://api.example.com/health",
                IntervalInSeconds = 60,
                Status = MonitorStatus.Unknown,
                CreatedAt = checkedAt.AddHours(-1),
                UpdatedAt = checkedAt.AddHours(-1),
            });

            setupContext.MonitorLogs.AddRange(
                new MonitorLog
                {
                    Id = Guid.NewGuid(),
                    MonitorId = monitorId,
                    Status = MonitorStatus.Online,
                    StatusCode = 200,
                    ResponseTimeMs = 100,
                    CheckedAt = checkedAt.AddMinutes(-10),
                },
                new MonitorLog
                {
                    Id = Guid.NewGuid(),
                    MonitorId = monitorId,
                    Status = MonitorStatus.Offline,
                    StatusCode = 503,
                    ResponseTimeMs = 500,
                    CheckedAt = checkedAt.AddMinutes(-5),
                    ErrorMessage = "Service unavailable",
                });

            await setupContext.SaveChangesAsync();
        }

        RecordedMonitorCheckDto result;

        await using (var actContext = factory.CreateDbContext())
        {
            var repository = new MonitorExecutionRepository(actContext);

            // Act
            result = await repository.RecordCheckResultAsync(
                new RecordMonitorCheckDto
                {
                    MonitorId = monitorId,
                    Status = (int)MonitorStatus.Online,
                    StatusCode = 200,
                    ResponseTimeMs = 90,
                    CheckedAt = checkedAt,
                },
                CancellationToken.None);
        }

        await using var assertContext = factory.CreateDbContext();
        var persistedMonitor = await assertContext.Monitors.FindAsync(monitorId);
        var persistedLogs = assertContext.MonitorLogs.Where(x => x.MonitorId == monitorId).OrderBy(x => x.CheckedAt).ToList();

        // Assert
        Assert.NotNull(persistedMonitor);
        Assert.Equal(MonitorStatus.Online, persistedMonitor!.Status);
        Assert.Equal(checkedAt, persistedMonitor.UpdatedAt);
        Assert.Equal(3, persistedLogs.Count);
        Assert.Equal(3, result.Monitor.TotalChecks);
        Assert.Equal(1, result.Monitor.FailedChecks);
        Assert.Equal(66.66666666666667d, result.Monitor.UptimePercentage);
        Assert.Equal(200, result.Log.StatusCode);
        Assert.Equal(90, result.Log.ResponseTimeMs);
    }

    [Fact]
    public async Task RecordCheckResultAsync_ShouldThrowKeyNotFoundException_WhenMonitorDoesNotExist()
    {
        // Arrange
        using var factory = new SqliteTestDbContextFactory();
        await using var context = factory.CreateDbContext();
        var repository = new MonitorExecutionRepository(context);

        // Act
        var act = async () => await repository.RecordCheckResultAsync(
            new RecordMonitorCheckDto
            {
                MonitorId = Guid.NewGuid(),
                Status = (int)MonitorStatus.Offline,
                CheckedAt = DateTime.UtcNow,
            },
            CancellationToken.None);

        // Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(act);
    }
}
