namespace MonitoringPlatform.Domain.Enums
{
    public enum CloudIncidentStatus
    {
        Unknown = 0,
        Investigating = 1,
        Identified = 2,
        Monitoring = 3,
        Resolved = 4,
        Maintenance = 5,
        Scheduled = 6,
    }
}
