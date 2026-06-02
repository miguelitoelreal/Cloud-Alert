using System.Threading.Tasks;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Domain.Enums;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface IEmailTemplateRenderer
    {
        Task<(string subject, string body)> RenderMonitorDownAsync(UserAlertPreference pref, string monitorName, string monitorUrl, string? errorMessage, string tenantName);
        Task<(string subject, string body)> RenderMonitorRecoveredAsync(UserAlertPreference pref, string monitorName, string monitorUrl, string tenantName);
        Task<(string subject, string body)> RenderHighLatencyAsync(UserAlertPreference pref, string monitorName, string monitorUrl, long responseTimeMs, long thresholdMs, string tenantName);
        Task<(string subject, string body)> RenderCertificateExpiringAsync(UserAlertPreference pref, string monitorName, string monitorUrl, int daysRemaining, string tenantName);
        Task<(string subject, string body)> RenderCertificateExpiredAsync(UserAlertPreference pref, string monitorName, string monitorUrl, string tenantName);
        Task<(string subject, string body)> RenderCloudIncidentAsync(UserAlertPreference pref, string providerName, string incidentTitle, string incidentDescription, CloudIncidentSeverity severity, string tenantName);
        Task<(string subject, string body)> RenderSummaryDigestAsync(UserAlertPreference pref, string tenantName, AlertHistoryResponseDto[] alerts);
    }
}
