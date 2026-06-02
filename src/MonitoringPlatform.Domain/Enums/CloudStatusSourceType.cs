namespace MonitoringPlatform.Domain.Enums
{
    public enum CloudStatusSourceType
    {
        Rss = 1,
        Atom = 2,
        StatuspageApi = 3,
        JsonApi = 4,
        MicrosoftGraphServiceHealth = 5,
        AzureStatusApi = 6,
        GcpStatusApi = 7,
    }
}
