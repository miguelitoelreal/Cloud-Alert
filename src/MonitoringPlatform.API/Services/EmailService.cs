using System.Net;
using System.Net.Mail;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MonitoringPlatform.API.Configurations;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.API.Services
{
    public class EmailService : IEmailService
    {
        private readonly EmailOptions _fallbackOptions;
        private readonly AppDbContext _dbContext;
        private readonly ICurrentUserContext _currentUserContext;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<EmailService> _logger;

        public EmailService(
            IOptions<EmailOptions> options,
            AppDbContext dbContext,
            ICurrentUserContext currentUserContext,
            IHttpClientFactory httpClientFactory,
            ILogger<EmailService> logger)
        {
            _fallbackOptions = options.Value;
            _dbContext = dbContext;
            _currentUserContext = currentUserContext;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        public async Task<bool> SendEmailAsync(string toEmail, string subject, string htmlBody, Guid? tenantId = null)
        {
            var resolvedTenantId = tenantId ?? _currentUserContext.TenantId;
            var tenantConfig = await _dbContext.TenantSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.TenantId == resolvedTenantId);

            _logger.LogInformation("EmailService: TenantId={TenantId}, Found={Found}, Enabled={Enabled}, Provider={Provider}",
                resolvedTenantId, tenantConfig != null, tenantConfig?.EmailEnabled, tenantConfig?.EmailProvider);

            // If current tenant has no valid config, fall back to any tenant that has valid config
            var hasValidConfig = tenantConfig != null && (
                (tenantConfig.EmailProvider == "Brevo" && !string.IsNullOrWhiteSpace(tenantConfig.BrevoApiKey)) ||
                (tenantConfig.EmailProvider == "Smtp" && !string.IsNullOrWhiteSpace(tenantConfig.SmtpHost) && !string.IsNullOrWhiteSpace(tenantConfig.SmtpUsername) && !string.IsNullOrWhiteSpace(tenantConfig.SmtpPassword)));

            if (!hasValidConfig)
            {
                var anyConfig = await _dbContext.TenantSettings
                    .AsNoTracking()
                    .Where(s => s.EmailEnabled && (
                        (s.EmailProvider == "Brevo" && !string.IsNullOrWhiteSpace(s.BrevoApiKey)) ||
                        (s.EmailProvider == "Smtp" && !string.IsNullOrWhiteSpace(s.SmtpHost) && !string.IsNullOrWhiteSpace(s.SmtpUsername) && !string.IsNullOrWhiteSpace(s.SmtpPassword))))
                    .OrderByDescending(s => s.UpdatedAt)
                    .FirstOrDefaultAsync();

                if (anyConfig != null)
                {
                    _logger.LogInformation("EmailService: Falling back to tenant {FallbackTenantId} config.", anyConfig.TenantId);
                    tenantConfig = anyConfig;
                }
            }

            var enabled = tenantConfig?.EmailEnabled ?? _fallbackOptions.Enabled;
            if (!enabled)
            {
                _logger.LogWarning("Email service is disabled. Cannot send to {ToEmail}: {Subject}", toEmail, subject);
                return false;
            }

            var provider = string.IsNullOrWhiteSpace(tenantConfig?.EmailProvider)
                ? (_fallbackOptions.EmailProvider ?? "Smtp")
                : tenantConfig.EmailProvider;
            var senderEmail = string.IsNullOrWhiteSpace(tenantConfig?.SenderEmail)
                ? _fallbackOptions.SenderEmail
                : tenantConfig.SenderEmail;
            var senderName = string.IsNullOrWhiteSpace(tenantConfig?.SenderName)
                ? _fallbackOptions.SenderName
                : tenantConfig.SenderName;

            return provider switch
            {
                "Brevo" => await SendViaBrevoAsync(toEmail, subject, htmlBody, tenantConfig, senderEmail, senderName),
                _ => await SendViaSmtpAsync(toEmail, subject, htmlBody, tenantConfig, senderEmail, senderName),
            };
        }

        private async Task<bool> SendViaSmtpAsync(string toEmail, string subject, string htmlBody, MonitoringPlatform.Domain.Entities.TenantSettings? tenantConfig, string senderEmail, string senderName)
        {
            var smtpHost = tenantConfig?.SmtpHost ?? _fallbackOptions.SmtpHost;
            var smtpPort = tenantConfig?.SmtpPort ?? _fallbackOptions.SmtpPort;
            var smtpUsername = tenantConfig?.SmtpUsername ?? _fallbackOptions.SmtpUsername;
            var smtpPassword = tenantConfig?.SmtpPassword ?? _fallbackOptions.SmtpPassword;
            var useSsl = tenantConfig?.UseSsl ?? _fallbackOptions.UseSsl;

            _logger.LogInformation("SMTP config: Host={Host}, Port={Port}, User={User}, Sender={Sender}, SSL={Ssl}", smtpHost, smtpPort, smtpUsername, senderEmail, useSsl);

            if (string.IsNullOrWhiteSpace(smtpHost) || string.IsNullOrWhiteSpace(smtpUsername) || string.IsNullOrWhiteSpace(smtpPassword))
            {
                _logger.LogWarning("SMTP config is incomplete. Host, Username or Password is empty.");
                return false;
            }

            try
            {
                using var client = new SmtpClient(smtpHost, smtpPort);
                client.EnableSsl = useSsl;
                client.Credentials = new NetworkCredential(smtpUsername, smtpPassword);

                var mail = new MailMessage
                {
                    From = new MailAddress(senderEmail, senderName),
                    Subject = subject,
                    Body = htmlBody,
                    IsBodyHtml = true,
                };
                mail.To.Add(toEmail);

                await client.SendMailAsync(mail);
                _logger.LogInformation("SMTP email sent to {ToEmail}: {Subject}", toEmail, subject);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send SMTP email to {ToEmail}: {Subject}. Error: {Error}", toEmail, subject, ex.Message);
                return false;
            }
        }

        private async Task<bool> SendViaBrevoAsync(string toEmail, string subject, string htmlBody, MonitoringPlatform.Domain.Entities.TenantSettings? tenantConfig, string senderEmail, string senderName)
        {
            var apiKey = tenantConfig?.BrevoApiKey ?? _fallbackOptions.BrevoApiKey;

            _logger.LogInformation("Brevo config: Sender={Sender}, HasApiKey={HasApiKey}", senderEmail, !string.IsNullOrWhiteSpace(apiKey));

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                _logger.LogWarning("Brevo API key is missing.");
                return false;
            }

            try
            {
                var client = _httpClientFactory.CreateClient();
                var payload = new
                {
                    sender = new { name = senderName, email = senderEmail },
                    to = new[] { new { email = toEmail } },
                    subject,
                    htmlContent = htmlBody,
                };

                var json = JsonSerializer.Serialize(payload);
                using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email")
                {
                    Content = new StringContent(json, Encoding.UTF8, "application/json"),
                };
                request.Headers.Add("api-key", apiKey);

                var response = await client.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Brevo email sent to {ToEmail}: {Subject}", toEmail, subject);
                    return true;
                }

                var errorBody = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Brevo API returned {StatusCode}: {Body}", (int)response.StatusCode, errorBody);
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send Brevo email to {ToEmail}: {Subject}. Error: {Error}", toEmail, subject, ex.Message);
                return false;
            }
        }
    }
}
