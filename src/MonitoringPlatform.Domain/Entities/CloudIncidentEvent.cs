using MonitoringPlatform.Domain.Enums;

namespace MonitoringPlatform.Domain.Entities
{
    public class CloudIncidentEvent
    {
        public Guid Id { get; set; }
        public Guid CloudIncidentId { get; set; }
        public CloudIncidentStatus PreviousStatus { get; set; }
        public CloudIncidentStatus NewStatus { get; set; }
        public CloudIncidentSeverity? PreviousSeverity { get; set; }
        public CloudIncidentSeverity? NewSeverity { get; set; }
        public string? EventDescription { get; set; }
        public DateTime OccurredAt { get; set; }
        public DateTime CreatedAt { get; set; }

        public CloudIncident CloudIncident { get; set; } = null!;
    }
}
