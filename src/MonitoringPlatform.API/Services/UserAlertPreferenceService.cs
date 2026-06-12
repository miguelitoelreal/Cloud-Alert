using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.API.Services
{
    public class UserAlertPreferenceService
    {
        private readonly AppDbContext _dbContext;
        private readonly ICurrentUserContext _currentUser;

        public UserAlertPreferenceService(AppDbContext dbContext, ICurrentUserContext currentUser)
        {
            _dbContext = dbContext;
            _currentUser = currentUser;
        }

        public async Task<UserAlertPreferenceDto> GetMyPreferencesAsync(CancellationToken cancellationToken = default)
        {
            try
            {
                Console.WriteLine($"[UserAlertPreferenceService] GetMyPreferencesAsync - UserId: {_currentUser.UserId}, TenantId: {_currentUser.TenantId}");
                var pref = await _dbContext.UserAlertPreferences
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.UserId == _currentUser.UserId, cancellationToken);

                if (pref == null)
                {
                    Console.WriteLine($"[UserAlertPreferenceService] No preferences found, returning empty DTO");
                    return new UserAlertPreferenceDto();
                }

                Console.WriteLine($"[UserAlertPreferenceService] Found preferences, EmailEnabled: {pref.EmailEnabled}");
                return new UserAlertPreferenceDto
                {
                    EmailEnabled = pref.EmailEnabled,
                    MonitorDownAlerts = pref.MonitorDownAlerts,
                    MonitorRecoveredAlerts = pref.MonitorRecoveredAlerts,
                    HighLatencyAlerts = pref.HighLatencyAlerts,
                    CertificateExpiringAlerts = pref.CertificateExpiringAlerts,
                    CertificateExpiredAlerts = pref.CertificateExpiredAlerts,
                    CloudIncidentCriticalAlerts = pref.CloudIncidentCriticalAlerts,
                    CloudIncidentMajorAlerts = pref.CloudIncidentMajorAlerts,
                    CloudIncidentMinorAlerts = pref.CloudIncidentMinorAlerts,
                    ScheduledMaintenanceAlerts = pref.ScheduledMaintenanceAlerts,
                    IncidentResolvedAlerts = pref.IncidentResolvedAlerts,
                    IntegrationErrorAlerts = pref.IntegrationErrorAlerts,
                    CloudImportFailureAlerts = pref.CloudImportFailureAlerts,
                    BackgroundJobFailureAlerts = pref.BackgroundJobFailureAlerts,
                    MinimumSeverity = pref.MinimumSeverity,
                    SelectedCloudProviderIds = pref.GetSelectedProviderIds(),
                    MonitorSelectionMode = pref.MonitorSelectionMode,
                    SelectedMonitorIds = pref.GetSelectedMonitorIds(),
                    ExcludedMonitorIds = pref.GetExcludedMonitorIds(),
                    SummaryEnabled = pref.SummaryEnabled,
                    SummaryFrequency = pref.SummaryFrequency,
                    SummaryDay = pref.SummaryDay,
                    SummaryIncludeMonitors = pref.SummaryIncludeMonitors,
                    SummaryIncludeCloud = pref.SummaryIncludeCloud,
                    QuietHoursEnabled = pref.QuietHoursEnabled,
                    QuietHoursStart = pref.QuietHoursStart.ToString(@"hh\:mm"),
                    QuietHoursEnd = pref.QuietHoursEnd.ToString(@"hh\:mm"),
                    QuietHoursTimezone = pref.QuietHoursTimezone,
                    QuietHoursExcludeWeekends = pref.QuietHoursExcludeWeekends,
                    DeduplicationMinutes = pref.DeduplicationMinutes,
                    GroupSimilarIncidents = pref.GroupSimilarIncidents,
                    CooldownMinutes = pref.CooldownMinutes,
                    AdditionalEmails = pref.GetAdditionalEmails(),
                    EmailTemplate = pref.EmailTemplate,
                    IncludeTimeline = pref.IncludeTimeline,
                    IncludeMetrics = pref.IncludeMetrics,
                    IncludeDirectLinks = pref.IncludeDirectLinks,
                    IncludeCurrentStatus = pref.IncludeCurrentStatus,
                    Language = pref.Language,
                    CustomTenantName = pref.CustomTenantName,
                    CustomTenantLogoUrl = pref.CustomTenantLogoUrl,
                    CustomTenantColor = pref.CustomTenantColor,
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[UserAlertPreferenceService] ERROR: {ex.Message}");
                Console.WriteLine($"[UserAlertPreferenceService] StackTrace: {ex.StackTrace}");
                throw;
            }
        }

        public async Task UpdateMyPreferencesAsync(UserAlertPreferenceDto dto, CancellationToken cancellationToken = default)
        {
            var pref = await _dbContext.UserAlertPreferences
                .FirstOrDefaultAsync(p => p.UserId == _currentUser.UserId, cancellationToken);

            if (pref == null)
            {
                pref = new UserAlertPreference
                {
                    Id = Guid.NewGuid(),
                    UserId = _currentUser.UserId,
                    TenantId = _currentUser.TenantId,
                    CreatedAt = DateTime.UtcNow,
                };
                _dbContext.UserAlertPreferences.Add(pref);
            }

            pref.EmailEnabled = dto.EmailEnabled;
            pref.MonitorDownAlerts = dto.MonitorDownAlerts;
            pref.MonitorRecoveredAlerts = dto.MonitorRecoveredAlerts;
            pref.HighLatencyAlerts = dto.HighLatencyAlerts;
            pref.CertificateExpiringAlerts = dto.CertificateExpiringAlerts;
            pref.CertificateExpiredAlerts = dto.CertificateExpiredAlerts;
            pref.CloudIncidentCriticalAlerts = dto.CloudIncidentCriticalAlerts;
            pref.CloudIncidentMajorAlerts = dto.CloudIncidentMajorAlerts;
            pref.CloudIncidentMinorAlerts = dto.CloudIncidentMinorAlerts;
            pref.ScheduledMaintenanceAlerts = dto.ScheduledMaintenanceAlerts;
            pref.IncidentResolvedAlerts = dto.IncidentResolvedAlerts;
            pref.IntegrationErrorAlerts = dto.IntegrationErrorAlerts;
            pref.CloudImportFailureAlerts = dto.CloudImportFailureAlerts;
            pref.BackgroundJobFailureAlerts = dto.BackgroundJobFailureAlerts;
            pref.MinimumSeverity = dto.MinimumSeverity;
            pref.SetSelectedProviderIds(dto.SelectedCloudProviderIds);
            pref.MonitorSelectionMode = dto.MonitorSelectionMode ?? "All";
            pref.SetSelectedMonitorIds(dto.SelectedMonitorIds);
            pref.SetExcludedMonitorIds(dto.ExcludedMonitorIds);
            pref.SummaryEnabled = dto.SummaryEnabled;
            pref.SummaryFrequency = dto.SummaryFrequency;
            pref.SummaryDay = dto.SummaryDay;
            pref.SummaryIncludeMonitors = dto.SummaryIncludeMonitors;
            pref.SummaryIncludeCloud = dto.SummaryIncludeCloud;
            pref.QuietHoursEnabled = dto.QuietHoursEnabled;
            pref.QuietHoursStart = TimeSpan.TryParse(dto.QuietHoursStart, out var qs) ? qs : new TimeSpan(22, 0, 0);
            pref.QuietHoursEnd = TimeSpan.TryParse(dto.QuietHoursEnd, out var qe) ? qe : new TimeSpan(8, 0, 0);
            pref.QuietHoursTimezone = dto.QuietHoursTimezone ?? "America/Lima";
            pref.QuietHoursExcludeWeekends = dto.QuietHoursExcludeWeekends;
            pref.DeduplicationMinutes = dto.DeduplicationMinutes;
            pref.GroupSimilarIncidents = dto.GroupSimilarIncidents;
            pref.CooldownMinutes = dto.CooldownMinutes;
            pref.SetAdditionalEmails(dto.AdditionalEmails);
            pref.EmailTemplate = dto.EmailTemplate;
            pref.IncludeTimeline = dto.IncludeTimeline;
            pref.IncludeMetrics = dto.IncludeMetrics;
            pref.IncludeDirectLinks = dto.IncludeDirectLinks;
            pref.IncludeCurrentStatus = dto.IncludeCurrentStatus;
            pref.Language = dto.Language;
            pref.CustomTenantName = dto.CustomTenantName;
            pref.CustomTenantLogoUrl = dto.CustomTenantLogoUrl;
            pref.CustomTenantColor = dto.CustomTenantColor;
            pref.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        public async Task EnsureDefaultPreferencesAsync(Guid userId, Guid tenantId, CancellationToken cancellationToken = default)
        {
            var exists = await _dbContext.UserAlertPreferences
                .AnyAsync(p => p.UserId == userId, cancellationToken);
            if (exists) return;

            _dbContext.UserAlertPreferences.Add(new UserAlertPreference
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                TenantId = tenantId,
                EmailEnabled = true,
                MonitorDownAlerts = true,
                MonitorRecoveredAlerts = true,
                HighLatencyAlerts = false,
                CertificateExpiringAlerts = false,
                CertificateExpiredAlerts = false,
                CloudIncidentCriticalAlerts = true,
                CloudIncidentMajorAlerts = true,
                CloudIncidentMinorAlerts = false,
                ScheduledMaintenanceAlerts = false,
                IncidentResolvedAlerts = false,
                IntegrationErrorAlerts = false,
                CloudImportFailureAlerts = false,
                BackgroundJobFailureAlerts = false,
                MinimumSeverity = NotificationSeverity.Medium,
                MonitorSelectionMode = "All",
                SummaryEnabled = false,
                SummaryFrequency = SummaryFrequency.Weekly,
                SummaryDay = DayOfWeek.Monday,
                SummaryIncludeMonitors = true,
                SummaryIncludeCloud = true,
                QuietHoursEnabled = false,
                QuietHoursStart = new TimeSpan(22, 0, 0),
                QuietHoursEnd = new TimeSpan(8, 0, 0),
                QuietHoursTimezone = "America/Lima",
                QuietHoursExcludeWeekends = false,
                DeduplicationMinutes = 15,
                GroupSimilarIncidents = true,
                CooldownMinutes = 5,
                EmailTemplate = EmailTemplateType.Detailed,
                IncludeTimeline = true,
                IncludeMetrics = true,
                IncludeDirectLinks = true,
                IncludeCurrentStatus = true,
                Language = NotificationLanguage.Spanish,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });

            await _dbContext.SaveChangesAsync(cancellationToken);
        }
    }
}
