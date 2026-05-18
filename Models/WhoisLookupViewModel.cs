namespace CloudAlertApp.Models;

public class WhoisLookupPageViewModel
{
    public string DomainQuery { get; set; } = string.Empty;
    public bool HasSearched { get; set; }
    public string? ErrorMessage { get; set; }
    public WhoisLookupResultViewModel? Result { get; set; }
}

public class WhoisLookupResultViewModel
{
    public string DomainName { get; set; } = string.Empty;
    public string RegistrarName { get; set; } = "No disponible";
    public string? RegistrarHandle { get; set; }
    public string? RegistrantName { get; set; }
    public string? RdapServer { get; set; }
    public DateTimeOffset? CreatedAtUtc { get; set; }
    public DateTimeOffset? UpdatedAtUtc { get; set; }
    public DateTimeOffset? ExpiresAtUtc { get; set; }
    public List<string> NameServers { get; set; } = new();
    public List<string> Statuses { get; set; } = new();
}