using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.API.Services
{
    public class SummaryDigestBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<SummaryDigestBackgroundService> _logger;
        private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(1);

        public SummaryDigestBackgroundService(IServiceProvider serviceProvider, ILogger<SummaryDigestBackgroundService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Summary digest background service started");
            using var timer = new PeriodicTimer(_checkInterval);
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
                    _logger.LogError(ex, "Error in summary digest cycle");
                }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
            _logger.LogInformation("Summary digest background service stopped");
        }

        private async Task RunCycleAsync(CancellationToken cancellationToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var renderer = scope.ServiceProvider.GetRequiredService<IEmailTemplateRenderer>();
            var dispatcher = scope.ServiceProvider.GetRequiredService<INotificationDispatcher>();
            var historyRepo = scope.ServiceProvider.GetRequiredService<IAlertHistoryRepository>();
            var nowUtc = DateTime.UtcNow;

            var usersWithSummary = await context.Users
                .AsNoTracking()
                .Where(u => u.EmailConfirmed)
                .ToListAsync(cancellationToken);

            var userIds = usersWithSummary.Select(u => u.Id).ToList();
            var preferences = await context.UserAlertPreferences
                .AsNoTracking()
                .Where(p => userIds.Contains(p.UserId) && p.EmailEnabled && p.SummaryEnabled)
                .ToListAsync(cancellationToken);

            foreach (var pref in preferences)
            {
                var user = usersWithSummary.FirstOrDefault(u => u.Id == pref.UserId);
                if (user == null || string.IsNullOrWhiteSpace(user.Email)) continue;

                if (!ShouldSendNow(pref, nowUtc)) continue;

                var window = GetSummaryWindow(pref);
                var alerts = await historyRepo.GetRecentByTenantAsync(pref.TenantId, window);
                var alertArray = alerts.ToArray();

                var tenant = await context.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == pref.TenantId, cancellationToken);
                var tenantName = tenant?.Name ?? "MonitoringPlatform";

                if (alertArray.Length == 0)
                {
                    _logger.LogInformation("No alerts for user {UserId} in the last {Window}, skipping digest", pref.UserId, window);
                    continue;
                }

                var (subject, body) = await renderer.RenderSummaryDigestAsync(pref, tenantName, alertArray);

                var emails = new System.Collections.Generic.List<string> { user.Email };
                emails.AddRange(pref.GetAdditionalEmails());

                foreach (var email in emails.Distinct(System.StringComparer.OrdinalIgnoreCase))
                {
                    if (string.IsNullOrWhiteSpace(email)) continue;
                    await dispatcher.DispatchAsync(email, subject, body, pref.TenantId, AlertType.MonitorDown, cancellationToken);
                }

                _logger.LogInformation("Sent summary digest to user {UserId} with {Count} alerts", pref.UserId, alertArray.Length);
            }
        }

        private static bool ShouldSendNow(UserAlertPreference pref, DateTime nowUtc)
        {
            if (!pref.SummaryEnabled) return false;

            TimeZoneInfo tz;
            try { tz = TimeZoneInfo.FindSystemTimeZoneById(pref.QuietHoursTimezone); }
            catch { tz = TimeZoneInfo.Utc; }

            var localNow = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, tz);

            return pref.SummaryFrequency switch
            {
                SummaryFrequency.Instant => true,
                SummaryFrequency.Every15Min => localNow.Minute % 15 == 0,
                SummaryFrequency.Hourly => localNow.Minute == 0,
                SummaryFrequency.Daily => localNow.Minute == 0 && localNow.Hour == 9 && (int)localNow.DayOfWeek == (int)pref.SummaryDay,
                SummaryFrequency.Weekly => localNow.Minute == 0 && localNow.Hour == 9 && localNow.DayOfWeek == pref.SummaryDay,
                _ => false,
            };
        }

        private static TimeSpan GetSummaryWindow(UserAlertPreference pref)
        {
            return pref.SummaryFrequency switch
            {
                SummaryFrequency.Instant => TimeSpan.FromMinutes(1),
                SummaryFrequency.Every15Min => TimeSpan.FromMinutes(15),
                SummaryFrequency.Hourly => TimeSpan.FromHours(1),
                SummaryFrequency.Daily => TimeSpan.FromDays(1),
                SummaryFrequency.Weekly => TimeSpan.FromDays(7),
                _ => TimeSpan.FromHours(1),
            };
        }
    }
}
