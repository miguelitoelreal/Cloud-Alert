namespace CloudAlertApp.Models;

public class CloudStatusPageViewModel
{
    public DateTimeOffset LastCheckedAtUtc { get; set; }
    public DateTimeOffset LastUpdatedAtUtc { get; set; }
    public int HealthyCount { get; set; }
    public int AttentionCount { get; set; }
    public string Overview { get; set; } = string.Empty;
    public List<CloudServiceStatusViewModel> Services { get; set; } = new();
}

public class CloudServiceStatusViewModel
{
    public string Slug { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Accent { get; set; } = "neutral";
    public string EnvironmentLabel { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string DisplayStatus { get; set; } = string.Empty;
    public string Level { get; set; } = "info";
    public string Scope { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string SourceLabel { get; set; } = string.Empty;
    public string SourceUrl { get; set; } = string.Empty;
    public DateTimeOffset SourceUpdatedAtUtc { get; set; }
    public int DaysWithoutIncidents { get; set; }
    public int SortOrder { get; set; }
}

public class CloudServiceDetailPageViewModel
{
    public DateTimeOffset LastCheckedAtUtc { get; set; }
    public DateTimeOffset LastUpdatedAtUtc { get; set; }
    public string StatusSummary { get; set; } = string.Empty;
    public CloudServiceStatusViewModel SelectedService { get; set; } = new();
    public List<CloudServiceStatusViewModel> RelatedServices { get; set; } = new();
}