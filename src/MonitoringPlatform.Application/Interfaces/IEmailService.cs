using System;
using System.Threading.Tasks;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface IEmailService
    {
        Task<bool> SendEmailAsync(string toEmail, string subject, string htmlBody, Guid? tenantId = null);
    }
}
