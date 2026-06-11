using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MonitoringPlatform.API.Services;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Infrastructure.Persistence;
using DomainMonitor = MonitoringPlatform.Domain.Entities.Monitor;

namespace MonitoringPlatform.IntegrationTests.TestHelpers;

public sealed class ApiWebApplicationFactory : WebApplicationFactory<Program>, IAsyncDisposable
{
    private static readonly Guid SeedTenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    private readonly SqliteConnection _connection;
    private readonly HttpMessageHandler? _translationMessageHandler;

    public ApiWebApplicationFactory(HttpMessageHandler? translationMessageHandler = null)
    {
        _translationMessageHandler = translationMessageHandler;
        _connection = new SqliteConnection("Data Source=:memory:");
        _connection.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureLogging(logging =>
        {
            logging.ClearProviders();
        });

        builder.ConfigureServices(services =>
        {
            var dbContextOptionsDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (dbContextOptionsDescriptor is not null)
            {
                services.Remove(dbContextOptionsDescriptor);
            }

            var dbContextDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(AppDbContext));
            if (dbContextDescriptor is not null)
            {
                services.Remove(dbContextDescriptor);
            }

            var monitoringHostedServiceDescriptor = services.SingleOrDefault(d =>
                d.ServiceType == typeof(Microsoft.Extensions.Hosting.IHostedService)
                && d.ImplementationType == typeof(MonitoringBackgroundService));

            if (monitoringHostedServiceDescriptor is not null)
            {
                services.Remove(monitoringHostedServiceDescriptor);
            }

            var cloudStatusHostedServiceDescriptor = services.SingleOrDefault(d =>
                d.ServiceType == typeof(Microsoft.Extensions.Hosting.IHostedService)
                && d.ImplementationType == typeof(CloudStatusIngestionService));

            if (cloudStatusHostedServiceDescriptor is not null)
            {
                services.Remove(cloudStatusHostedServiceDescriptor);
            }

            services.AddDbContext<AppDbContext>(options => options.UseSqlite(_connection));

            if (_translationMessageHandler is not null)
            {
                services.AddHttpClient("CloudStatusHttpClient")
                    .ConfigurePrimaryHttpMessageHandler(() => _translationMessageHandler);
            }
        });
    }

    public async Task ResetDatabaseAsync()
    {
        await using var scope = Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureDeletedAsync();
        await context.Database.EnsureCreatedAsync();
    }

    public async Task<(HttpClient Client, AuthResponseDto Session)> CreateAuthenticatedClientAsync(
        string name = "Integration User",
        string email = "integration@example.com",
        string password = "Password1")
    {
        var client = CreateClient(new() { BaseAddress = new Uri("https://localhost") });
        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequestDto
        {
            Name = name,
            Email = email,
            Password = password,
        });

        response.EnsureSuccessStatusCode();
        var session = await response.Content.ReadFromJsonAsync<AuthResponseDto>();
        if (session is null)
        {
            throw new InvalidOperationException("No se pudo crear la sesión autenticada de prueba.");
        }

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", session.AccessToken);
        await MoveSeededResourcesToTenantAsync(session.User.TenantId);
        return (client, session);
    }

    public async Task SeedAsync(params object[] entities)
    {
        await using var scope = Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await EnsureSeedTenantAsync(context);
        foreach (var entity in entities)
        {
            if (entity is DomainMonitor monitor && monitor.TenantId == Guid.Empty)
            {
                monitor.TenantId = SeedTenantId;
            }
            else if (entity is CloudProvider provider && provider.TenantId == Guid.Empty)
            {
                provider.TenantId = SeedTenantId;
            }
        }
        context.AddRange(entities);
        await context.SaveChangesAsync();
    }

    private static async Task EnsureSeedTenantAsync(AppDbContext context)
    {
        if (await context.Tenants.AnyAsync(x => x.Id == SeedTenantId))
        {
            return;
        }

        context.Tenants.Add(new Tenant
        {
            Id = SeedTenantId,
            Name = "Integration Workspace",
            Slug = "integration-workspace",
            CreatedAtUtc = DateTime.UtcNow,
        });
        await context.SaveChangesAsync();
    }

    private async Task MoveSeededResourcesToTenantAsync(Guid tenantId)
    {
        await using var scope = Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var monitors = await context.Monitors.Where(x => x.TenantId == SeedTenantId).ToListAsync();
        foreach (var monitor in monitors)
        {
            monitor.TenantId = tenantId;
        }

        var providers = await context.CloudProviders.Where(x => x.TenantId == SeedTenantId).ToListAsync();
        foreach (var provider in providers)
        {
            provider.TenantId = tenantId;
        }

        await context.SaveChangesAsync();
    }

    public async Task<T?> FindAsync<T>(params object[] keyValues) where T : class
    {
        await using var scope = Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await context.FindAsync<T>(keyValues);
    }

    public new async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        await _connection.DisposeAsync();
    }
}
