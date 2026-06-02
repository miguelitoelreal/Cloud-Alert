using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MonitoringPlatform.API.Configurations;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.API.Services
{
    public class CloudProviderUptimeSnapshotBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<CloudProviderUptimeSnapshotBackgroundService> _logger;
        private readonly CloudStatusOptions _options;

        public CloudProviderUptimeSnapshotBackgroundService(
            IServiceProvider serviceProvider,
            IOptions<CloudStatusOptions> options,
            ILogger<CloudProviderUptimeSnapshotBackgroundService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _options = options.Value;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_options.Enabled)
            {
                _logger.LogInformation("Cloud uptime snapshot worker is disabled.");
                return;
            }

            _logger.LogInformation("Cloud uptime snapshot worker started.");

            // Daily at midnight UTC
            var now = DateTime.UtcNow;
            var nextMidnight = now.Date.AddDays(1);
            var initialDelay = nextMidnight - now;

            await Task.Delay(initialDelay, stoppingToken);

            using var timer = new PeriodicTimer(TimeSpan.FromDays(1));

            do
            {
                try
                {
                    await RunSnapshotAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Unexpected error in cloud uptime snapshot cycle");
                }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));

            _logger.LogInformation("Cloud uptime snapshot worker stopped.");
        }

        private async Task RunSnapshotAsync(CancellationToken cancellationToken)
        {
            await using var scope = _serviceProvider.CreateAsyncScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var yesterday = DateTime.UtcNow.Date.AddDays(-1);
            var today = DateTime.UtcNow.Date;

            var providers = await context.CloudProviders
                .AsNoTracking()
                .Where(p => p.IsEnabled)
                .ToListAsync(cancellationToken);

            var providerIds = providers.Select(p => p.Id).ToList();

            var incidents = await context.CloudIncidents
                .AsNoTracking()
                .Where(i => providerIds.Contains(i.CloudProviderId)
                            && i.OccurredAt >= yesterday
                            && i.OccurredAt < today)
                .ToListAsync(cancellationToken);

            foreach (var provider in providers)
            {
                var providerIncidents = incidents.Where(i => i.CloudProviderId == provider.Id).ToList();
                var resolved = providerIncidents.Where(i => i.ResolvedAt.HasValue).ToList();
                var active = providerIncidents.Where(i => !i.ResolvedAt.HasValue).ToList();

                var downtimeMinutes = resolved.Sum(i => (i.ResolvedAt!.Value - i.OccurredAt).TotalMinutes)
                                      + active.Sum(i => (today - i.OccurredAt).TotalMinutes);
                downtimeMinutes = Math.Min(downtimeMinutes, 1440); // Max 24h

                var uptimePercent = (decimal)((1440 - downtimeMinutes) / 1440 * 100);

                var mttrMinutes = resolved.Count > 0
                    ? (int)resolved.Average(i => (i.ResolvedAt!.Value - i.OccurredAt).TotalMinutes)
                    : 0;

                var snapshot = new CloudProviderUptimeSnapshot
                {
                    Id = Guid.NewGuid(),
                    TenantId = provider.TenantId,
                    CloudProviderId = provider.Id,
                    Date = yesterday,
                    UptimePercent = uptimePercent,
                    IncidentCount = providerIncidents.Count,
                    AvgMttrMinutes = mttrMinutes,
                    DowntimeMinutes = (int)downtimeMinutes,
                    CreatedAt = DateTime.UtcNow,
                };

                context.CloudProviderUptimeSnapshots.Add(snapshot);
            }

            await context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation(
                "Created {SnapshotCount} uptime snapshots for {ProviderCount} providers.",
                providers.Count,
                providers.Count);
        }
    }
}
