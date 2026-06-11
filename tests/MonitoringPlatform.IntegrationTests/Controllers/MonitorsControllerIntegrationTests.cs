using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.IntegrationTests.TestHelpers;
using DomainMonitor = MonitoringPlatform.Domain.Entities.Monitor;

namespace MonitoringPlatform.IntegrationTests.Controllers;

public class MonitorsControllerIntegrationTests
{
    [Fact]
    public async Task GetAll_ShouldReturnUnauthorized_WhenUserIsAnonymous()
    {
        // Arrange
        await using var factory = new ApiWebApplicationFactory();
        await factory.ResetDatabaseAsync();
        var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });

        // Act
        var response = await client.GetAsync("/api/monitors");

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetAll_ShouldReturnSeededMonitors()
    {
        // Arrange
        await using var factory = new ApiWebApplicationFactory();
        await factory.ResetDatabaseAsync();

        await factory.SeedAsync(
            new DomainMonitor
            {
                Id = Guid.NewGuid(),
                Name = "Alpha API",
                Url = "https://alpha.example.com/health",
                IntervalInSeconds = 60,
                Status = MonitorStatus.Online,
                CreatedAt = DateTime.UtcNow.AddHours(-1),
                UpdatedAt = DateTime.UtcNow.AddMinutes(-10),
            },
            new DomainMonitor
            {
                Id = Guid.NewGuid(),
                Name = "Beta API",
                Url = "https://beta.example.com/health",
                IntervalInSeconds = 120,
                Status = MonitorStatus.Offline,
                CreatedAt = DateTime.UtcNow.AddHours(-2),
                UpdatedAt = DateTime.UtcNow.AddMinutes(-5),
            });

        var (client, _) = await factory.CreateAuthenticatedClientAsync();

        // Act
        var response = await client.GetAsync("/api/monitors");

        // Assert
        response.EnsureSuccessStatusCode();
        var monitors = await response.Content.ReadFromJsonAsync<List<MonitorResponseDto>>();
        Assert.NotNull(monitors);
        Assert.Equal(2, monitors!.Count);
        Assert.Contains(monitors, x => x.Name == "Alpha API");
        Assert.Contains(monitors, x => x.Name == "Beta API");
    }

    [Fact]
    public async Task Post_ShouldCreateMonitor_WhenRequestIsValid()
    {
        // Arrange
        await using var factory = new ApiWebApplicationFactory();
        await factory.ResetDatabaseAsync();
        var (client, _) = await factory.CreateAuthenticatedClientAsync();

        var request = new
        {
            name = "New API",
            url = "https://new.example.com/health",
            intervalInSeconds = 90,
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/monitors", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<MonitorResponseDto>();
        Assert.NotNull(created);
        Assert.Equal("New API", created!.Name);
        Assert.Equal(90, created.IntervalInSeconds);

        var persisted = await factory.FindAsync<DomainMonitor>(created.Id);
        Assert.NotNull(persisted);
        Assert.Equal(MonitorStatus.Unknown, persisted!.Status);
    }

    [Fact]
    public async Task Post_ShouldReturnBadRequestProblemDetails_WhenUrlIsInvalid()
    {
        // Arrange
        await using var factory = new ApiWebApplicationFactory();
        await factory.ResetDatabaseAsync();
        var (client, _) = await factory.CreateAuthenticatedClientAsync();

        var request = new
        {
            name = "Broken API",
            url = "invalid-url",
            intervalInSeconds = 60,
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/monitors", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal("Bad Request", problem!.Title);
        Assert.Equal("A valid URL is required", problem.Detail);
    }

    [Fact]
    public async Task Put_ShouldUpdateExistingMonitor_WhenRequestIsValid()
    {
        // Arrange
        await using var factory = new ApiWebApplicationFactory();
        await factory.ResetDatabaseAsync();

        var monitorId = Guid.NewGuid();
        await factory.SeedAsync(new DomainMonitor
        {
            Id = monitorId,
            Name = "Legacy API",
            Url = "https://legacy.example.com/health",
            IntervalInSeconds = 60,
            Status = MonitorStatus.Unknown,
            CreatedAt = DateTime.UtcNow.AddHours(-1),
            UpdatedAt = DateTime.UtcNow.AddHours(-1),
        });

        var (client, _) = await factory.CreateAuthenticatedClientAsync();
        var request = new
        {
            name = "Legacy API v2",
            url = "https://legacy.example.com/status",
            intervalInSeconds = 180,
        };

        // Act
        var response = await client.PutAsJsonAsync($"/api/monitors/{monitorId}", request);

        // Assert
        response.EnsureSuccessStatusCode();
        var updated = await response.Content.ReadFromJsonAsync<MonitorResponseDto>();
        Assert.NotNull(updated);
        Assert.Equal("Legacy API v2", updated!.Name);
        Assert.Equal(180, updated.IntervalInSeconds);

        var persisted = await factory.FindAsync<DomainMonitor>(monitorId);
        Assert.NotNull(persisted);
        Assert.Equal("Legacy API v2", persisted!.Name);
        Assert.Equal("https://legacy.example.com/status", persisted.Url);
    }

    [Fact]
    public async Task Put_ShouldReturnNotFound_WhenMonitorDoesNotExist()
    {
        // Arrange
        await using var factory = new ApiWebApplicationFactory();
        await factory.ResetDatabaseAsync();
        var (client, _) = await factory.CreateAuthenticatedClientAsync();

        var request = new
        {
            name = "Ghost API",
            url = "https://ghost.example.com/health",
            intervalInSeconds = 60,
        };

        // Act
        var response = await client.PutAsJsonAsync($"/api/monitors/{Guid.NewGuid()}", request);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Delete_ShouldRemoveMonitor_WhenItExists()
    {
        // Arrange
        await using var factory = new ApiWebApplicationFactory();
        await factory.ResetDatabaseAsync();

        var monitorId = Guid.NewGuid();
        await factory.SeedAsync(new DomainMonitor
        {
            Id = monitorId,
            Name = "Disposable API",
            Url = "https://disposable.example.com/health",
            IntervalInSeconds = 60,
            Status = MonitorStatus.Online,
            CreatedAt = DateTime.UtcNow.AddHours(-1),
            UpdatedAt = DateTime.UtcNow.AddMinutes(-10),
        });

        var (client, _) = await factory.CreateAuthenticatedClientAsync();

        // Act
        var response = await client.DeleteAsync($"/api/monitors/{monitorId}");

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var persisted = await factory.FindAsync<DomainMonitor>(monitorId);
        Assert.Null(persisted);
    }
}
