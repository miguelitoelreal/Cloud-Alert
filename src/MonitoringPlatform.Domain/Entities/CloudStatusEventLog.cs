namespace MonitoringPlatform.Domain.Entities
{
    public enum CloudStatusEventType
    {
        IncidentCreated = 1,
        IncidentUpdated = 2,
        IncidentResolved = 3,
        CorrelationDetected = 4,
        ImpactDetected = 5,
        ProviderSynced = 6,
        ProviderSyncFailed = 7,
    }

    public class CloudStatusEventLog
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public CloudStatusEventType EventType { get; set; }
        public Guid? CloudIncidentId { get; set; }
        public Guid? CloudProviderId { get; set; }
        public string? PayloadJson { get; set; }
        public DateTime OccurredAt { get; set; }
        public DateTime CreatedAt { get; set; }

        public Tenant Tenant { get; set; } = null!;
    }
}
