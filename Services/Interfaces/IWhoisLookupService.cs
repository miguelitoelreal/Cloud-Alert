using CloudAlertApp.Models;

namespace CloudAlertApp.Services.Interfaces;

public interface IWhoisLookupService
{
    Task<WhoisLookupResultViewModel> LookupAsync(string domain, CancellationToken cancellationToken = default);
}