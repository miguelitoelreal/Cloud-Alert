namespace CloudAlertApp.Models;

public class ServiceNotificationsPageViewModel
{
    public List<string> AvailableServices { get; set; } = new();
    public Dictionary<string, ServiceNotificationStatusViewModel> ServiceStatuses { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public int RegisteredClientsCount { get; set; }
}

public class ServiceNotificationStatusViewModel
{
    public string DisplayStatus { get; set; } = "Sin estado disponible";
    public string Level { get; set; } = "info";
}