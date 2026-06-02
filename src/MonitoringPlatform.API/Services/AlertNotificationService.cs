using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Domain.Enums;
using MonitoringPlatform.Infrastructure.Persistence;
using MonitoringPlatform.Infrastructure.Persistence.Identity;

namespace MonitoringPlatform.API.Services
{
    public class AlertNotificationService : IAlertNotificationService
    {
        private readonly AppDbContext _context;
        private readonly IAlertRuleRepository _ruleRepository;
        private readonly IAlertHistoryRepository _historyRepository;
        private readonly IEmailTemplateRenderer _templateRenderer;
        private readonly INotificationDispatcher _dispatcher;
        private readonly ILogger<AlertNotificationService> _logger;

        public AlertNotificationService(
            AppDbContext context,
            IAlertRuleRepository ruleRepository,
            IAlertHistoryRepository historyRepository,
            IEmailTemplateRenderer templateRenderer,
            INotificationDispatcher dispatcher,
            ILogger<AlertNotificationService> logger)
        {
            _context = context;
            _ruleRepository = ruleRepository;
            _historyRepository = historyRepository;
            _templateRenderer = templateRenderer;
            _dispatcher = dispatcher;
            _logger = logger;
        }

        // ─── Helpers ─────────────────────────────────────────────

        private static bool IsInQuietHours(UserAlertPreference pref, DateTime utcNow)
        {
            if (!pref.QuietHoursEnabled) return false;

            TimeZoneInfo tz;
            try { tz = TimeZoneInfo.FindSystemTimeZoneById(pref.QuietHoursTimezone); }
            catch { tz = TimeZoneInfo.Utc; }

            var localNow = TimeZoneInfo.ConvertTimeFromUtc(utcNow, tz);
            var dayOfWeek = localNow.DayOfWeek;
            if (pref.QuietHoursExcludeWeekends && (dayOfWeek == DayOfWeek.Saturday || dayOfWeek == DayOfWeek.Sunday))
                return false;

            var start = pref.QuietHoursStart;
            var end = pref.QuietHoursEnd;

            var current = localNow.TimeOfDay;
            if (start <= end)
                return current >= start && current <= end;
            else
                return current >= start || current <= end;
        }

        private static bool IsMonitorSelected(UserAlertPreference pref, Guid monitorId)
        {
            return pref.MonitorSelectionMode switch
            {
                "Selected" => pref.GetSelectedMonitorIds().Contains(monitorId),
                "Excluded" => !pref.GetExcludedMonitorIds().Contains(monitorId),
                _ => true,
            };
        }

        private static NotificationSeverity MapCloudSeverity(CloudIncidentSeverity severity)
        {
            return severity switch
            {
                CloudIncidentSeverity.Critical => NotificationSeverity.Critical,
                CloudIncidentSeverity.Major => NotificationSeverity.High,
                CloudIncidentSeverity.Minor => NotificationSeverity.Medium,
                CloudIncidentSeverity.Informational => NotificationSeverity.Low,
                _ => NotificationSeverity.Low,
            };
        }

        private static bool MeetsMinimumSeverity(CloudIncidentSeverity incidentSeverity, NotificationSeverity minimumSeverity)
        {
            var mapped = MapCloudSeverity(incidentSeverity);
            return mapped <= minimumSeverity; // lower numeric value = higher severity
        }

        private async Task<bool> ShouldThrottleAsync(UserAlertPreference pref, string email, AlertType alertType)
        {
            var window = TimeSpan.FromMinutes(pref.DeduplicationMinutes);
            return await _historyRepository.WasRecentlySentAsync(email, alertType, window);
        }

        // ─── Public methods ────────────────────────────────────────

        public async Task NotifyMonitorDownAsync(Guid monitorId, string monitorName, string monitorUrl, string? errorMessage, CancellationToken cancellationToken = default)
        {
            var monitor = await _context.Monitors.AsNoTracking().FirstOrDefaultAsync(m => m.Id == monitorId, cancellationToken);
            if (monitor == null)
            {
                _logger.LogWarning("Monitor {MonitorId} not found for alert", monitorId);
                return;
            }

            var tenantId = monitor.TenantId;
            var tenant = await _context.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
            var tenantName = tenant?.Name ?? "MonitoringPlatform";

            var users = await _context.Users
                .AsNoTracking()
                .Where(u => u.TenantId == tenantId && u.EmailConfirmed)
                .ToListAsync(cancellationToken);

            var userIds = users.Select(u => u.Id).ToList();
            var preferences = await _context.UserAlertPreferences
                .AsNoTracking()
                .Where(p => userIds.Contains(p.UserId) && p.EmailEnabled && p.MonitorDownAlerts)
                .ToListAsync(cancellationToken);

            var nowUtc = DateTime.UtcNow;
            var sentEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var user in users)
            {
                var pref = preferences.FirstOrDefault(p => p.UserId == user.Id);
                if (pref == null) continue;
                if (!IsMonitorSelected(pref, monitorId)) continue;
                if (IsInQuietHours(pref, nowUtc))
                {
                    _logger.LogInformation("Quiet hours active for user {UserId}, skipping monitor down alert", user.Id);
                    continue;
                }

                var emails = new List<string>();
                if (!string.IsNullOrWhiteSpace(user.Email)) emails.Add(user.Email);
                emails.AddRange(pref.GetAdditionalEmails());

                foreach (var email in emails)
                {
                    if (string.IsNullOrWhiteSpace(email) || sentEmails.Contains(email)) continue;

                    if (await ShouldThrottleAsync(pref, email, AlertType.MonitorDown))
                    {
                        _logger.LogInformation("Throttling monitor down alert for {Email}", email);
                        continue;
                    }

                    var (subject, body) = await _templateRenderer.RenderMonitorDownAsync(pref, monitorName, monitorUrl, errorMessage, tenantName);
                    await _dispatcher.DispatchQuietAsync(email, subject, body, tenantId, AlertType.MonitorDown, pref.CooldownMinutes, pref.GroupSimilarIncidents, cancellationToken);
                    sentEmails.Add(email);
                }
            }
        }

        public async Task NotifyMonitorRecoveredAsync(Guid monitorId, string monitorName, string monitorUrl, CancellationToken cancellationToken = default)
        {
            var monitor = await _context.Monitors.AsNoTracking().FirstOrDefaultAsync(m => m.Id == monitorId, cancellationToken);
            if (monitor == null) return;

            var tenantId = monitor.TenantId;
            var tenant = await _context.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
            var tenantName = tenant?.Name ?? "MonitoringPlatform";

            var users = await _context.Users
                .AsNoTracking()
                .Where(u => u.TenantId == tenantId && u.EmailConfirmed)
                .ToListAsync(cancellationToken);

            var userIds = users.Select(u => u.Id).ToList();
            var preferences = await _context.UserAlertPreferences
                .AsNoTracking()
                .Where(p => userIds.Contains(p.UserId) && p.EmailEnabled && p.MonitorRecoveredAlerts)
                .ToListAsync(cancellationToken);

            var nowUtc = DateTime.UtcNow;
            var sentEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var user in users)
            {
                var pref = preferences.FirstOrDefault(p => p.UserId == user.Id);
                if (pref == null) continue;
                if (!IsMonitorSelected(pref, monitorId)) continue;
                if (IsInQuietHours(pref, nowUtc)) continue;

                var emails = new List<string>();
                if (!string.IsNullOrWhiteSpace(user.Email)) emails.Add(user.Email);
                emails.AddRange(pref.GetAdditionalEmails());

                foreach (var email in emails)
                {
                    if (string.IsNullOrWhiteSpace(email) || sentEmails.Contains(email)) continue;
                    if (await ShouldThrottleAsync(pref, email, AlertType.MonitorRecovered)) continue;

                    var (subject, body) = await _templateRenderer.RenderMonitorRecoveredAsync(pref, monitorName, monitorUrl, tenantName);
                    await _dispatcher.DispatchQuietAsync(email, subject, body, tenantId, AlertType.MonitorRecovered, pref.CooldownMinutes, pref.GroupSimilarIncidents, cancellationToken);
                    sentEmails.Add(email);
                }
            }
        }

        public async Task NotifyHighLatencyAsync(Guid monitorId, string monitorName, string monitorUrl, long responseTimeMs, long thresholdMs, CancellationToken cancellationToken = default)
        {
            var monitor = await _context.Monitors.AsNoTracking().FirstOrDefaultAsync(m => m.Id == monitorId, cancellationToken);
            if (monitor == null) return;

            var tenantId = monitor.TenantId;
            var tenant = await _context.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
            var tenantName = tenant?.Name ?? "MonitoringPlatform";

            var users = await _context.Users
                .AsNoTracking()
                .Where(u => u.TenantId == tenantId && u.EmailConfirmed)
                .ToListAsync(cancellationToken);

            var userIds = users.Select(u => u.Id).ToList();
            var preferences = await _context.UserAlertPreferences
                .AsNoTracking()
                .Where(p => userIds.Contains(p.UserId) && p.EmailEnabled && p.HighLatencyAlerts)
                .ToListAsync(cancellationToken);

            var nowUtc = DateTime.UtcNow;
            var sentEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var user in users)
            {
                var pref = preferences.FirstOrDefault(p => p.UserId == user.Id);
                if (pref == null) continue;
                if (!IsMonitorSelected(pref, monitorId)) continue;
                if (IsInQuietHours(pref, nowUtc)) continue;

                var emails = new List<string>();
                if (!string.IsNullOrWhiteSpace(user.Email)) emails.Add(user.Email);
                emails.AddRange(pref.GetAdditionalEmails());

                foreach (var email in emails)
                {
                    if (string.IsNullOrWhiteSpace(email) || sentEmails.Contains(email)) continue;
                    if (await ShouldThrottleAsync(pref, email, AlertType.HighLatency)) continue;

                    var (subject, body) = await _templateRenderer.RenderHighLatencyAsync(pref, monitorName, monitorUrl, responseTimeMs, thresholdMs, tenantName);
                    await _dispatcher.DispatchQuietAsync(email, subject, body, tenantId, AlertType.HighLatency, pref.CooldownMinutes, pref.GroupSimilarIncidents, cancellationToken);
                    sentEmails.Add(email);
                }
            }
        }

        public async Task NotifyCloudIncidentAsync(Guid providerId, string providerName, string incidentTitle, string incidentDescription, CloudIncidentSeverity severity, CancellationToken cancellationToken = default)
        {
            var alertType = severity == CloudIncidentSeverity.Critical
                ? AlertType.CloudIncidentCritical
                : severity == CloudIncidentSeverity.Major
                    ? AlertType.CloudIncidentMajor
                    : AlertType.CloudIncidentMinor;

            var tenants = await _context.Tenants.AsNoTracking().ToListAsync(cancellationToken);

            foreach (var tenant in tenants)
            {
                var tenantId = tenant.Id;
                var tenantName = tenant.Name ?? "MonitoringPlatform";

                var users = await _context.Users
                    .AsNoTracking()
                    .Where(u => u.TenantId == tenantId && u.EmailConfirmed)
                    .ToListAsync(cancellationToken);

                var userIds = users.Select(u => u.Id).ToList();
                var preferences = await _context.UserAlertPreferences
                    .AsNoTracking()
                    .Where(p => userIds.Contains(p.UserId) && p.EmailEnabled)
                    .ToListAsync(cancellationToken);

                var nowUtc = DateTime.UtcNow;
                var sentEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                foreach (var user in users)
                {
                    var pref = preferences.FirstOrDefault(p => p.UserId == user.Id);
                    if (pref == null) continue;

                    var wantsThisType = alertType switch
                    {
                        AlertType.CloudIncidentCritical => pref.CloudIncidentCriticalAlerts,
                        AlertType.CloudIncidentMajor => pref.CloudIncidentMajorAlerts,
                        AlertType.CloudIncidentMinor => pref.CloudIncidentMinorAlerts,
                        _ => false,
                    };

                    if (!wantsThisType) continue;
                    if (!MeetsMinimumSeverity(severity, pref.MinimumSeverity)) continue;

                    var wantsThisProvider = pref.GetSelectedProviderIds().Contains(providerId);
                    if (!wantsThisProvider) continue;

                    if (IsInQuietHours(pref, nowUtc))
                    {
                        _logger.LogInformation("Quiet hours active for user {UserId}, skipping cloud incident alert", user.Id);
                        continue;
                    }

                    var emails = new List<string>();
                    if (!string.IsNullOrWhiteSpace(user.Email)) emails.Add(user.Email);
                    emails.AddRange(pref.GetAdditionalEmails());

                    foreach (var email in emails)
                    {
                        if (string.IsNullOrWhiteSpace(email) || sentEmails.Contains(email)) continue;
                        if (await ShouldThrottleAsync(pref, email, alertType)) continue;

                        var (subject, body) = await _templateRenderer.RenderCloudIncidentAsync(pref, providerName, incidentTitle, incidentDescription, severity, tenantName);
                        await _dispatcher.DispatchQuietAsync(email, subject, body, tenantId, alertType, pref.CooldownMinutes, pref.GroupSimilarIncidents, cancellationToken);
                        sentEmails.Add(email);
                    }
                }
            }
        }

        public async Task NotifyCertificateExpiringAsync(Guid monitorId, string monitorName, string monitorUrl, int daysRemaining, CancellationToken cancellationToken = default)
        {
            var monitor = await _context.Monitors.AsNoTracking().FirstOrDefaultAsync(m => m.Id == monitorId, cancellationToken);
            if (monitor == null) return;

            var tenantId = monitor.TenantId;
            var tenant = await _context.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
            var tenantName = tenant?.Name ?? "MonitoringPlatform";

            var users = await _context.Users
                .AsNoTracking()
                .Where(u => u.TenantId == tenantId && u.EmailConfirmed)
                .ToListAsync(cancellationToken);

            var userIds = users.Select(u => u.Id).ToList();
            var preferences = await _context.UserAlertPreferences
                .AsNoTracking()
                .Where(p => userIds.Contains(p.UserId) && p.EmailEnabled && p.CertificateExpiringAlerts)
                .ToListAsync(cancellationToken);

            var nowUtc = DateTime.UtcNow;
            var sentEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var user in users)
            {
                var pref = preferences.FirstOrDefault(p => p.UserId == user.Id);
                if (pref == null) continue;
                if (!IsMonitorSelected(pref, monitorId)) continue;
                if (IsInQuietHours(pref, nowUtc)) continue;

                var emails = new List<string>();
                if (!string.IsNullOrWhiteSpace(user.Email)) emails.Add(user.Email);
                emails.AddRange(pref.GetAdditionalEmails());

                foreach (var email in emails)
                {
                    if (string.IsNullOrWhiteSpace(email) || sentEmails.Contains(email)) continue;
                    if (await ShouldThrottleAsync(pref, email, AlertType.CertificateExpiring)) continue;

                    var (subject, body) = await _templateRenderer.RenderCertificateExpiringAsync(pref, monitorName, monitorUrl, daysRemaining, tenantName);
                    await _dispatcher.DispatchQuietAsync(email, subject, body, tenantId, AlertType.CertificateExpiring, pref.CooldownMinutes, pref.GroupSimilarIncidents, cancellationToken);
                    sentEmails.Add(email);
                }
            }
        }

        public async Task NotifyCertificateExpiredAsync(Guid monitorId, string monitorName, string monitorUrl, CancellationToken cancellationToken = default)
        {
            var monitor = await _context.Monitors.AsNoTracking().FirstOrDefaultAsync(m => m.Id == monitorId, cancellationToken);
            if (monitor == null) return;

            var tenantId = monitor.TenantId;
            var tenant = await _context.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
            var tenantName = tenant?.Name ?? "MonitoringPlatform";

            var users = await _context.Users
                .AsNoTracking()
                .Where(u => u.TenantId == tenantId && u.EmailConfirmed)
                .ToListAsync(cancellationToken);

            var userIds = users.Select(u => u.Id).ToList();
            var preferences = await _context.UserAlertPreferences
                .AsNoTracking()
                .Where(p => userIds.Contains(p.UserId) && p.EmailEnabled && p.CertificateExpiredAlerts)
                .ToListAsync(cancellationToken);

            var nowUtc = DateTime.UtcNow;
            var sentEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var user in users)
            {
                var pref = preferences.FirstOrDefault(p => p.UserId == user.Id);
                if (pref == null) continue;
                if (!IsMonitorSelected(pref, monitorId)) continue;
                if (IsInQuietHours(pref, nowUtc)) continue;

                var emails = new List<string>();
                if (!string.IsNullOrWhiteSpace(user.Email)) emails.Add(user.Email);
                emails.AddRange(pref.GetAdditionalEmails());

                foreach (var email in emails)
                {
                    if (string.IsNullOrWhiteSpace(email) || sentEmails.Contains(email)) continue;
                    if (await ShouldThrottleAsync(pref, email, AlertType.CertificateExpired)) continue;

                    var (subject, body) = await _templateRenderer.RenderCertificateExpiredAsync(pref, monitorName, monitorUrl, tenantName);
                    await _dispatcher.DispatchQuietAsync(email, subject, body, tenantId, AlertType.CertificateExpired, pref.CooldownMinutes, pref.GroupSimilarIncidents, cancellationToken);
                    sentEmails.Add(email);
                }
            }
        }
    }
}
