using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Options;
using MonitoringPlatform.API.Configurations;
using MonitoringPlatform.API.Hubs;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Application.Services;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Domain.Enums;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.API.Services
{
    public class CloudStatusIngestionService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<CloudStatusIngestionService> _logger;
        private readonly CloudStatusOptions _options;
        private readonly IHubContext<MonitoringHub> _hubContext;
        private readonly IDistributedCache _cache;

        public CloudStatusIngestionService(
            IServiceProvider serviceProvider,
            IOptions<CloudStatusOptions> options,
            ILogger<CloudStatusIngestionService> logger,
            IHubContext<MonitoringHub> hubContext,
            IDistributedCache cache)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _options = options.Value;
            _hubContext = hubContext;
            _cache = cache;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_options.Enabled)
            {
                _logger.LogInformation("Cloud status ingestion worker is disabled by configuration.");
                return;
            }

            if (_options.Providers.Count == 0)
            {
                _logger.LogWarning("Cloud status ingestion worker started without configured providers.");
                return;
            }

            _logger.LogInformation(
                "Cloud status ingestion worker started. Interval: {IntervalSeconds}s, Providers: {ProviderCount}",
                _options.IntervalSeconds,
                _options.Providers.Count);

            using var timer = new PeriodicTimer(TimeSpan.FromSeconds(Math.Max(30, _options.IntervalSeconds)));

            do
            {
                try
                {
                    await RunCycleAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Unexpected error in cloud status ingestion cycle");
                }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));

            _logger.LogInformation("Cloud status ingestion worker stopped.");
        }

        private async Task RunCycleAsync(CancellationToken cancellationToken)
        {
            await using var scope = _serviceProvider.CreateAsyncScope();
            var coordinator = scope.ServiceProvider.GetRequiredService<CloudStatusIngestionCoordinator>();
            var result = await coordinator.IngestAsync(_options.ToSeedDtos(), cancellationToken);

            _logger.LogInformation(
                "Cloud status ingestion cycle finished. Providers: {ProcessedProviders}, Success: {SuccessfulProviders}, Failed: {FailedProviders}, ChangedIncidents: {ChangedIncidents}",
                result.ProcessedProviders,
                result.SuccessfulProviders,
                result.FailedProviders,
                result.ChangedIncidents);

            // Invalidate cache to ensure fresh data
            try
            {
                var keys = new[] { "cs_overview_all_all_False_80", "cs_overview_all_all_True_80" };
                foreach (var key in keys)
                {
                    await _cache.RemoveAsync(key, cancellationToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to invalidate cloud status cache");
            }

            if (result.ChangedIncidents > 0)
            {
                await _hubContext.Clients.All.SendAsync(
                    "CloudStatusChanged",
                    new
                    {
                        updatedAt = DateTime.UtcNow,
                        changedIncidents = result.ChangedIncidents,
                    },
                    cancellationToken);

                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var alertService = scope.ServiceProvider.GetRequiredService<IAlertNotificationService>();
                var impactService = scope.ServiceProvider.GetRequiredService<ICloudImpactAssessmentService>();
                var eventPublisher = scope.ServiceProvider.GetRequiredService<ICloudStatusEventPublisher>();

                // Impact assessment for all tenants
                try
                {
                    await impactService.AssessImpactForRecentIncidentsAsync(cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Impact assessment failed after ingestion");
                }

                var since = DateTime.UtcNow.AddMinutes(-5);
                var recentCritical = await dbContext.CloudIncidents
                    .AsNoTracking()
                    .Where(i => i.IsActive && i.CreatedAt >= since && i.Severity == CloudIncidentSeverity.Critical)
                    .ToListAsync(cancellationToken);
                foreach (var incident in recentCritical)
                {
                    var provider = await dbContext.CloudProviders
                        .AsNoTracking()
                        .FirstOrDefaultAsync(p => p.Id == incident.CloudProviderId, cancellationToken);
                    await alertService.NotifyCloudIncidentAsync(
                        incident.CloudProviderId,
                        provider?.Name ?? "Desconocido",
                        incident.Title,
                        incident.Description,
                        incident.Severity,
                        cancellationToken);
                }

                var recentMajor = await dbContext.CloudIncidents
                    .AsNoTracking()
                    .Where(i => i.IsActive && i.CreatedAt >= since && i.Severity == CloudIncidentSeverity.Major)
                    .ToListAsync(cancellationToken);
                foreach (var incident in recentMajor)
                {
                    var provider = await dbContext.CloudProviders
                        .AsNoTracking()
                        .FirstOrDefaultAsync(p => p.Id == incident.CloudProviderId, cancellationToken);
                    await alertService.NotifyCloudIncidentAsync(
                        incident.CloudProviderId,
                        provider?.Name ?? "Desconocido",
                        incident.Title,
                        incident.Description,
                        incident.Severity,
                        cancellationToken);
                }

                var recentMinor = await dbContext.CloudIncidents
                    .AsNoTracking()
                    .Where(i => i.IsActive && i.CreatedAt >= since && i.Severity == CloudIncidentSeverity.Minor)
                    .ToListAsync(cancellationToken);
                foreach (var incident in recentMinor)
                {
                    var provider = await dbContext.CloudProviders
                        .AsNoTracking()
                        .FirstOrDefaultAsync(p => p.Id == incident.CloudProviderId, cancellationToken);
                    await alertService.NotifyCloudIncidentAsync(
                        incident.CloudProviderId,
                        provider?.Name ?? "Desconocido",
                        incident.Title,
                        incident.Description,
                        incident.Severity,
                        cancellationToken);
                }
            }
        }
    }
}
