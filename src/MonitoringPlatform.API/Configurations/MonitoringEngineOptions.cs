namespace MonitoringPlatform.API.Configurations
{
    public class MonitoringEngineOptions
    {
        public int GlobalIntervalSeconds { get; set; } = 10;
        public int HttpTimeoutSeconds { get; set; } = 5;
        public int MaxRetries { get; set; } = 2;
        public int MaxConcurrentChecks { get; set; } = 4;
        public int LatencyThresholdMs { get; set; } = 2000;
    }
}
