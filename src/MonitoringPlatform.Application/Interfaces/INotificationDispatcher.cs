using System.Threading;
using System.Threading.Tasks;
using MonitoringPlatform.Domain.Entities;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface INotificationDispatcher
    {
        Task<bool> DispatchAsync(string email, string subject, string htmlBody, Guid tenantId, AlertType alertType, CancellationToken cancellationToken = default);
        Task<bool> DispatchQuietAsync(string email, string subject, string htmlBody, Guid tenantId, AlertType alertType, int cooldownMinutes, bool groupSimilar = false, CancellationToken cancellationToken = default);
        Task<bool> DispatchWebhookAsync(string url, object payload, Guid tenantId, AlertType alertType, CancellationToken cancellationToken = default);
    }
}
