namespace CloudAlertApp.Models;

public class ServiceNotificationsPageViewModel
{
    public List<string> AvailableServices { get; set; } = new();
    public int RegisteredClientsCount { get; set; }
}