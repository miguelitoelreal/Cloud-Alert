namespace MonitoringPlatform.Application.DTOs
{
    public class CreateMonitorDto
    {
        public string Name { get; set; } = null!;
        public string Url { get; set; } = null!;
        public int IntervalInSeconds { get; set; }
    }

    public class UpdateMonitorDto
    {
        public string Name { get; set; } = null!;
        public string Url { get; set; } = null!;
        public int IntervalInSeconds { get; set; }
    }

    public class MonitorResponseDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = null!;
        public string Url { get; set; } = null!;
        public int IntervalInSeconds { get; set; }
        public int Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
