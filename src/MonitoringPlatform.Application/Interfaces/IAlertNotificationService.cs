using System;
using System.Threading;
using System.Threading.Tasks;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Domain.Enums;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface IAlertNotificationService
    {
        Task NotifyMonitorDownAsync(Guid monitorId, string monitorName, string monitorUrl, string? errorMessage, CancellationToken cancellationToken = default);
        Task NotifyMonitorRecoveredAsync(Guid monitorId, string monitorName, string monitorUrl, CancellationToken cancellationToken = default);
        Task NotifyHighLatencyAsync(Guid monitorId, string monitorName, string monitorUrl, long responseTimeMs, long thresholdMs, CancellationToken cancellationToken = default);
        Task NotifyCertificateExpiringAsync(Guid monitorId, string monitorName, string monitorUrl, int daysRemaining, CancellationToken cancellationToken = default);
        Task NotifyCertificateExpiredAsync(Guid monitorId, string monitorName, string monitorUrl, CancellationToken cancellationToken = default);
        Task NotifyCloudIncidentAsync(Guid providerId, string providerName, string incidentTitle, string incidentDescription, CloudIncidentSeverity severity, CancellationToken cancellationToken = default);
    }
}
