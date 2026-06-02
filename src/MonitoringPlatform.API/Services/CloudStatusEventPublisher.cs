using Microsoft.AspNetCore.SignalR;
using MonitoringPlatform.API.Hubs;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Domain.Enums;
using MonitoringPlatform.Infrastructure.Persistence;
using System.Text.Json;

namespace MonitoringPlatform.API.Services
{
    public class CloudStatusEventPublisher : ICloudStatusEventPublisher
    {
        private const string TenantGroupPrefix = "tenant-";

        private readonly AppDbContext _context;
        private readonly IHubContext<MonitoringHub> _hubContext;
        private readonly ILogger<CloudStatusEventPublisher> _logger;

        public CloudStatusEventPublisher(
            AppDbContext context,
            IHubContext<MonitoringHub> hubContext,
            ILogger<CloudStatusEventPublisher> logger)
        {
            _context = context;
            _hubContext = hubContext;
            _logger = logger;
        }

        public async Task PublishIncidentCreatedAsync(CloudIncident incident, CancellationToken cancellationToken = default)
        {
            var tenantId = incident.CloudProvider?.TenantId ?? Guid.Empty;
            await LogEventAsync(tenantId, CloudStatusEventType.IncidentCreated, incident.Id, incident.CloudProviderId, cancellationToken);
            await BroadcastAsync("IncidentCreated", new
            {
                incidentId = incident.Id,
                providerId = incident.CloudProviderId,
                providerName = incident.CloudProvider?.Name,
                title = incident.Title,
                severity = incident.Severity,
                region = incident.Region,
                occurredAt = incident.OccurredAt,
            }, cancellationToken);
        }

        public async Task PublishIncidentUpdatedAsync(CloudIncident incident, CloudIncidentStatus previousStatus, CancellationToken cancellationToken = default)
        {
            var tenantId = incident.CloudProvider?.TenantId ?? Guid.Empty;
            await LogEventAsync(tenantId, CloudStatusEventType.IncidentUpdated, incident.Id, incident.CloudProviderId, cancellationToken);
            await BroadcastAsync("IncidentUpdated", new
            {
                incidentId = incident.Id,
                providerId = incident.CloudProviderId,
                providerName = incident.CloudProvider?.Name,
                title = incident.Title,
                previousStatus,
                newStatus = incident.Status,
                severity = incident.Severity,
                updatedAt = incident.LastUpdatedAt,
            }, cancellationToken);
        }

        public async Task PublishIncidentResolvedAsync(CloudIncident incident, CancellationToken cancellationToken = default)
        {
            var tenantId = incident.CloudProvider?.TenantId ?? Guid.Empty;
            await LogEventAsync(tenantId, CloudStatusEventType.IncidentResolved, incident.Id, incident.CloudProviderId, cancellationToken);
            await BroadcastAsync("IncidentResolved", new
            {
                incidentId = incident.Id,
                providerId = incident.CloudProviderId,
                providerName = incident.CloudProvider?.Name,
                title = incident.Title,
                resolvedAt = incident.ResolvedAt,
            }, cancellationToken);
        }

        public async Task PublishCorrelationDetectedAsync(CloudIncidentGroup group, CancellationToken cancellationToken = default)
        {
            await LogEventAsync(group.TenantId, CloudStatusEventType.CorrelationDetected, null, null, cancellationToken);
            await BroadcastAsync("CorrelationDetected", new
            {
                groupId = group.Id,
                title = group.Title,
                rootCause = group.RootCause,
                incidentCount = group.Correlations.Count,
                detectedAt = group.DetectedAt,
            }, cancellationToken);
        }

        public async Task PublishImpactDetectedAsync(CloudIncidentImpact impact, CancellationToken cancellationToken = default)
        {
            await LogEventAsync(impact.TenantId, CloudStatusEventType.ImpactDetected, impact.CloudIncidentId, null, cancellationToken);
            await SendToTenantAsync(impact.TenantId, "ImpactDetected", new
            {
                impactId = impact.Id,
                incidentId = impact.CloudIncidentId,
                monitorId = impact.MonitorId,
                impactLevel = impact.ImpactLevel,
                reason = impact.Reason,
                detectedAt = impact.CalculatedAt,
            }, cancellationToken);
        }

        public async Task PublishProviderSyncedAsync(Guid providerId, string providerName, CancellationToken cancellationToken = default)
        {
            await LogEventAsync(Guid.Empty, CloudStatusEventType.ProviderSynced, null, providerId, cancellationToken);
            await BroadcastAsync("ProviderSynced", new
            {
                providerId,
                providerName,
                syncedAt = DateTime.UtcNow,
            }, cancellationToken);
        }

        public async Task PublishProviderSyncFailedAsync(Guid providerId, string providerName, string error, CancellationToken cancellationToken = default)
        {
            await LogEventAsync(Guid.Empty, CloudStatusEventType.ProviderSyncFailed, null, providerId, cancellationToken);
            await BroadcastAsync("ProviderSyncFailed", new
            {
                providerId,
                providerName,
                error,
                failedAt = DateTime.UtcNow,
            }, cancellationToken);
        }

        private async Task LogEventAsync(Guid tenantId, CloudStatusEventType eventType, Guid? incidentId, Guid? providerId, CancellationToken cancellationToken)
        {
            if (tenantId == Guid.Empty)
            {
                return;
            }

            _context.CloudStatusEventLogs.Add(new CloudStatusEventLog
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                EventType = eventType,
                CloudIncidentId = incidentId,
                CloudProviderId = providerId,
                PayloadJson = JsonSerializer.Serialize(new { tenantId, eventType, incidentId, providerId, occurredAt = DateTime.UtcNow }),
                OccurredAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
            });

            await _context.SaveChangesAsync(cancellationToken);
        }

        private async Task BroadcastAsync(string methodName, object payload, CancellationToken cancellationToken)
        {
            try
            {
                await _hubContext.Clients.All.SendAsync(methodName, payload, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to broadcast SignalR event {MethodName}", methodName);
            }
        }

        private async Task SendToTenantAsync(Guid tenantId, string methodName, object payload, CancellationToken cancellationToken)
        {
            try
            {
                await _hubContext.Clients.Group($"{TenantGroupPrefix}{tenantId}")
                    .SendAsync(methodName, payload, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send SignalR event {MethodName} to tenant {TenantId}", methodName, tenantId);
            }
        }
    }
}
