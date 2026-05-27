using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.API.Services
{
    public class NotificationDispatcher : INotificationDispatcher
    {
        private readonly IEmailService _emailService;
        private readonly IAlertHistoryRepository _historyRepository;
        private readonly ILogger<NotificationDispatcher> _logger;
        private readonly ConcurrentDictionary<string, DateTime> _grouped = new();
        private static readonly TimeSpan GroupWindow = TimeSpan.FromMinutes(15);

        public NotificationDispatcher(
            IEmailService emailService,
            IAlertHistoryRepository historyRepository,
            ILogger<NotificationDispatcher> logger)
        {
            _emailService = emailService;
            _historyRepository = historyRepository;
            _logger = logger;
        }

        public async Task<bool> DispatchAsync(string email, string subject, string htmlBody, Guid tenantId, AlertType alertType, CancellationToken cancellationToken = default)
        {
            var success = await _emailService.SendEmailAsync(email, subject, htmlBody, tenantId);
            await _historyRepository.RecordAsync(new AlertHistory
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                AlertRuleId = null,
                AlertType = alertType,
                Channel = AlertChannel.Email,
                Subject = subject,
                Message = htmlBody,
                RecipientEmail = email,
                SentAt = DateTime.UtcNow,
                IsSuccess = success,
                ErrorMessage = success ? null : "Falló el envío de email",
            });
            return success;
        }

        public async Task<bool> DispatchQuietAsync(string email, string subject, string htmlBody, Guid tenantId, AlertType alertType, int cooldownMinutes, bool groupSimilar = false, CancellationToken cancellationToken = default)
        {
            if (groupSimilar)
            {
                var key = $"{email}:{alertType}";
                if (_grouped.TryGetValue(key, out var lastSent) && DateTime.UtcNow - lastSent < GroupWindow)
                {
                    _logger.LogInformation("Grouped similar incident for {Email} on {AlertType}, skipping", email, alertType);
                    return false;
                }
                _grouped[key] = DateTime.UtcNow;
            }

            if (cooldownMinutes > 0)
            {
                var recentlySent = await _historyRepository.WasRecentlySentAsync(email, alertType, TimeSpan.FromMinutes(cooldownMinutes));
                if (recentlySent)
                {
                    _logger.LogInformation("Cooldown active for {Email} on {AlertType}, skipping", email, alertType);
                    return false;
                }
            }

            return await DispatchAsync(email, subject, htmlBody, tenantId, alertType, cancellationToken);
        }
    }
}
