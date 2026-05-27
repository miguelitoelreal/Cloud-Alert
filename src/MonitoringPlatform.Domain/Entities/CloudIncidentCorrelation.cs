namespace MonitoringPlatform.Domain.Entities
{
    public class CloudIncidentCorrelation
    {
        public Guid Id { get; set; }
        public Guid GroupId { get; set; }
        public Guid CloudIncidentId { get; set; }
        public double CorrelationScore { get; set; }
        public string? CorrelationReason { get; set; }
        public DateTime CreatedAt { get; set; }

        public CloudIncidentGroup Group { get; set; } = null!;
        public CloudIncident CloudIncident { get; set; } = null!;
    }
}
