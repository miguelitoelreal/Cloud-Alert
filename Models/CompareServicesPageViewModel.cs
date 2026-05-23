namespace CloudAlertApp.Models;

public class CompareServicesPageViewModel
{
    public DateTimeOffset LastCheckedAtUtc { get; set; }
    public DateTimeOffset LastUpdatedAtUtc { get; set; }
    public List<CloudServiceStatusViewModel> Services { get; set; } = new();
    public string SelectedLeftSlug { get; set; } = string.Empty;
    public string SelectedRightSlug { get; set; } = string.Empty;
    public CloudServiceStatusViewModel? LeftService { get; set; }
    public CloudServiceStatusViewModel? RightService { get; set; }
    public ServiceComparisonMetricsViewModel? LeftMetrics { get; set; }
    public ServiceComparisonMetricsViewModel? RightMetrics { get; set; }
    public string ErrorMessage { get; set; } = string.Empty;
}

public class ServiceComparisonMetricsViewModel
{
    public decimal UptimePercentage { get; set; }
    public decimal CurrentSlaPercentage { get; set; }
    public int DaysWithIncidents { get; set; }
    public int DaysWithoutIncidents { get; set; }
    public int TotalIncidents { get; set; }
    public int DowntimeMinutes { get; set; }
    public decimal ActiveHours { get; set; }
    public string CurrentStatus { get; set; } = string.Empty;
    public string CurrentStatusLevel { get; set; } = "info";
    public string LastIncidentLabel { get; set; } = "Sin incidentes registrados";
}