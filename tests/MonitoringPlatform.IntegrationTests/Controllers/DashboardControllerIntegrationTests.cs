using System.Net.Http.Json;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.IntegrationTests.TestHelpers;
using DomainMonitor = MonitoringPlatform.Domain.Entities.Monitor;

namespace MonitoringPlatform.IntegrationTests.Controllers;

public class DashboardControllerIntegrationTests
{
    [Fact]
    public async Task GetMonitors_ShouldReturnCalculatedMetrics()
    {
        // Arrange
        await using var factory = new ApiWebApplicationFactory();
        await factory.ResetDatabaseAsync();

        var monitorId = Guid.NewGuid();
        var now = new DateTime(2026, 5, 23, 15, 0, 0, DateTimeKind.Utc);

        await factory.SeedAsync(
            new DomainMonitor
            {
                Id = monitorId,
                Name = "Payments API",
                Url = "https://payments.example.com/health",
                IntervalInSeconds = 60,
                Status = MonitorStatus.Unknown,
                CreatedAt = now.AddHours(-3),
                UpdatedAt = now.AddHours(-3),
            },
            new MonitorLog
            {
                Id = Guid.NewGuid(),
                MonitorId = monitorId,
                Status = MonitorStatus.Online,
                StatusCode = 200,
                ResponseTimeMs = 120,
                CheckedAt = now.AddMinutes(-10),
            },
            new MonitorLog
            {
                Id = Guid.NewGuid(),
                MonitorId = monitorId,
                Status = MonitorStatus.Offline,
                StatusCode = 503,
                ResponseTimeMs = 800,
                CheckedAt = now.AddMinutes(-3),
                ErrorMessage = "Service unavailable",
            });

        var (client, _) = await factory.CreateAuthenticatedClientAsync(
            email: "dashboard@example.com");

        // Act
        var response = await client.GetAsync("/api/dashboard/monitors");

        // Assert
        response.EnsureSuccessStatusCode();
        var summaries = await response.Content.ReadFromJsonAsync<List<DashboardMonitorSummaryDto>>();
        Assert.NotNull(summaries);
        var summary = Assert.Single(summaries!);
        Assert.Equal(monitorId, summary.Id);
        Assert.Equal((int)MonitorStatus.Offline, summary.CurrentStatus);
        Assert.Equal(2, summary.TotalChecks);
        Assert.Equal(1, summary.FailedChecks);
        Assert.Equal(50d, summary.UptimePercentage);
        Assert.Equal(800, summary.LastResponseTimeMs);
        Assert.Equal(now.AddMinutes(-3), summary.LastCheckedAt);
    }
}
