using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.API.Services;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Domain.Enums;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.API.Controllers
{
    [ApiController]
    [Route("api/alerts")]
    [Authorize]
    public class AlertController : ControllerBase
    {
        private readonly IAlertRuleRepository _ruleRepository;
        private readonly IAlertHistoryRepository _historyRepository;
        private readonly ICurrentUserContext _currentUser;
        private readonly UserAlertPreferenceService _preferenceService;
        private readonly AppDbContext _dbContext;
        private readonly IEmailService _emailService;
        private readonly IEmailTemplateRenderer _templateRenderer;

        public AlertController(
            IAlertRuleRepository ruleRepository,
            IAlertHistoryRepository historyRepository,
            ICurrentUserContext currentUser,
            UserAlertPreferenceService preferenceService,
            AppDbContext dbContext,
            IEmailService emailService,
            IEmailTemplateRenderer templateRenderer)
        {
            _ruleRepository = ruleRepository;
            _historyRepository = historyRepository;
            _currentUser = currentUser;
            _preferenceService = preferenceService;
            _dbContext = dbContext;
            _emailService = emailService;
            _templateRenderer = templateRenderer;
        }

        [HttpGet("rules")]
        public async Task<IActionResult> GetRules()
        {
            var rules = await _ruleRepository.GetAllByTenantAsync(_currentUser.TenantId);
            return Ok(rules);
        }

        [HttpPost("rules")]
        public async Task<IActionResult> CreateRule([FromBody] CreateAlertRuleDto dto)
        {
            var rule = await _ruleRepository.CreateAsync(_currentUser.TenantId, dto);
            return Ok(rule);
        }

        [HttpPut("rules/{id:guid}")]
        public async Task<IActionResult> UpdateRule(Guid id, [FromBody] UpdateAlertRuleDto dto)
        {
            var rule = await _ruleRepository.UpdateAsync(id, dto);
            if (rule == null) return NotFound();
            return Ok(rule);
        }

        [HttpDelete("rules/{id:guid}")]
        public async Task<IActionResult> DeleteRule(Guid id)
        {
            var deleted = await _ruleRepository.DeleteAsync(id);
            if (!deleted) return NotFound();
            return NoContent();
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetHistory([FromQuery] int limit = 50)
        {
            var history = await _historyRepository.GetByTenantAsync(_currentUser.TenantId, limit);
            return Ok(history);
        }

        [HttpGet("preferences")]
        public async Task<IActionResult> GetMyPreferences(CancellationToken cancellationToken)
        {
            try
            {
                Console.WriteLine($"[AlertController] GetMyPreferences - UserId: {_currentUser.UserId}, TenantId: {_currentUser.TenantId}");
                var preferences = await _preferenceService.GetMyPreferencesAsync(cancellationToken);
                Console.WriteLine($"[AlertController] GetMyPreferences - Success");
                return Ok(preferences);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AlertController] GetMyPreferences - Error: {ex.Message}");
                Console.WriteLine($"[AlertController] GetMyPreferences - StackTrace: {ex.StackTrace}");
                return StatusCode(500, new { message = "An unexpected error occurred.", error = ex.Message });
            }
        }

        [HttpPut("preferences")]
        public async Task<IActionResult> UpdateMyPreferences([FromBody] UserAlertPreferenceDto dto, CancellationToken cancellationToken)
        {
            await _preferenceService.UpdateMyPreferencesAsync(dto, cancellationToken);
            return NoContent();
        }

        [HttpGet("cloud-providers")]
        public async Task<IActionResult> GetCloudProviders(CancellationToken cancellationToken)
        {
            var systemTenant = await _dbContext.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Slug == "system-cloud-status", cancellationToken);
            var systemTenantId = systemTenant?.Id ?? Guid.Empty;

            var providers = await _dbContext.CloudProviders
                .AsNoTracking()
                .Where(c => c.IsEnabled && (c.TenantId == _currentUser.TenantId || (c.TenantId == systemTenantId && c.SourceType != MonitoringPlatform.Domain.Enums.CloudStatusSourceType.MicrosoftGraphServiceHealth)))
                .OrderBy(c => c.Name)
                .Select(c => new CloudProviderOptionDto
                {
                    Id = c.Id,
                    Name = c.Name,
                })
                .ToListAsync(cancellationToken);
            return Ok(providers);
        }

        [HttpPost("test-alert")]
        public async Task<IActionResult> SendTestAlert([FromBody] TestAlertRequestDto request, CancellationToken cancellationToken)
        {
            var pref = await _preferenceService.GetMyPreferencesAsync(cancellationToken);
            if (!pref.EmailEnabled)
            {
                return BadRequest(new { message = "Tienes desactivadas las alertas por email. Actívalas en preferencias para recibir la prueba." });
            }

            var user = await _dbContext.Users.AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);

            if (user == null) return NotFound();

            var tenant = await _dbContext.Tenants.AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == _currentUser.TenantId, cancellationToken);

            // Auto-select alert type based on user preferences
            var alertType = request.Type?.ToLowerInvariant() ?? "auto";
            if (alertType == "auto")
            {
                if (pref.CloudIncidentCriticalAlerts) alertType = "critical";
                else if (pref.CloudIncidentMajorAlerts) alertType = "major";
                else if (pref.MonitorDownAlerts) alertType = "monitor";
                else alertType = "monitor";
            }

            var typeLabel = alertType switch
            {
                "critical" => "Incidencia crítica",
                "major" => "Incidencia mayor",
                _ => "Monitor caído",
            };

            // Get selected cloud provider names (global system providers, no tenant filter)
            var selectedProviderIds = pref.SelectedCloudProviderIds ?? new List<Guid>();
            var providerNames = new List<string>();
            if (selectedProviderIds.Any())
            {
                providerNames = await _dbContext.CloudProviders
                    .AsNoTracking()
                    .Where(p => selectedProviderIds.Contains(p.Id))
                    .Select(p => p.Name)
                    .ToListAsync(cancellationToken);
            }

            // Try to get a real active incident from selected providers
            CloudIncident? realIncident = null;
            if (selectedProviderIds.Any())
            {
                // Log diagnostic info
                Console.WriteLine($"[TestAlert] Selected provider IDs: {string.Join(", ", selectedProviderIds)}");
                var allActive = await _dbContext.CloudIncidents
                    .AsNoTracking()
                    .Where(i => i.IsActive)
                    .Select(i => new { i.Id, i.CloudProviderId, i.Title })
                    .ToListAsync(cancellationToken);
                Console.WriteLine($"[TestAlert] Total active incidents in DB: {allActive.Count}");
                foreach (var inc in allActive)
                    Console.WriteLine($"[TestAlert]   Incident: {inc.Title} | ProviderId: {inc.CloudProviderId}");

                realIncident = await _dbContext.CloudIncidents
                    .AsNoTracking()
                    .Where(i => selectedProviderIds.Contains(i.CloudProviderId) && i.IsActive)
                    .OrderByDescending(i => i.OccurredAt)
                    .FirstOrDefaultAsync(cancellationToken);
                Console.WriteLine($"[TestAlert] Found matching real incident: {realIncident is not null}");
            }
            else
            {
                Console.WriteLine("[TestAlert] No provider IDs selected.");
            }

            // Use the improved template renderer for test alerts
            string subject;
            string body;
            var tenantName = tenant?.Name ?? "MonitoringPlatform";

            // Convert DTO to entity for template renderer
            var prefEntity = new UserAlertPreference
            {
                EmailEnabled = pref.EmailEnabled,
                CloudIncidentCriticalAlerts = pref.CloudIncidentCriticalAlerts,
                CloudIncidentMajorAlerts = pref.CloudIncidentMajorAlerts,
                CloudIncidentMinorAlerts = pref.CloudIncidentMinorAlerts,
                MonitorDownAlerts = pref.MonitorDownAlerts,
                MinimumSeverity = pref.MinimumSeverity,
                IncludeMetrics = pref.IncludeMetrics,
                IncludeDirectLinks = pref.IncludeDirectLinks,
                Language = pref.Language,
                CustomTenantName = pref.CustomTenantName,
                CustomTenantLogoUrl = pref.CustomTenantLogoUrl,
                CustomTenantColor = pref.CustomTenantColor,
            };
            prefEntity.SetSelectedProviderIds(pref.SelectedCloudProviderIds ?? new List<Guid>());

            if (alertType == "critical" || alertType == "major" || alertType == "minor")
            {
                // Cloud incident test - use the improved cloud incident template
                var severity = alertType switch
                {
                    "critical" => CloudIncidentSeverity.Critical,
                    "major" => CloudIncidentSeverity.Major,
                    "minor" => CloudIncidentSeverity.Minor,
                    _ => CloudIncidentSeverity.Minor,
                };

                var providerName = providerNames.Count > 0 ? providerNames[new Random().Next(providerNames.Count)] : "Cloud Provider";
                var title = realIncident?.Title ?? (alertType == "critical" ? "Incidencia Crítica" : alertType == "major" ? "Incidencia Mayor" : "Incidencia Menor");
                var description = realIncident?.Description ?? (alertType == "critical"
                    ? "Se ha detectado una incidencia crítica que afecta múltiples servicios."
                    : alertType == "major"
                        ? "Se ha detectado una incidencia mayor con degradación de servicios."
                        : "Se ha detectado una incidencia menor con impacto limitado.");

                (subject, body) = await _templateRenderer.RenderCloudIncidentAsync(prefEntity, providerName, title, description, severity, tenantName);
                subject = $"[PRUEBA] {subject}";
            }
            else
            {
                // Monitor test - use the monitor down template
                var monitorName = "API Gateway Production";
                var monitorUrl = "https://api.example.com";
                var errorMessage = "Connection timeout - No response from server";

                (subject, body) = await _templateRenderer.RenderMonitorDownAsync(prefEntity, monitorName, monitorUrl, errorMessage, tenantName);
                subject = $"[PRUEBA] {subject}";
            }

            var recipients = new List<string> { user.Email! };
            recipients.AddRange(pref.AdditionalEmails ?? new List<string>());
            recipients = recipients.Where(e => !string.IsNullOrWhiteSpace(e)).Distinct().ToList();

            var errors = new List<string>();
            foreach (var email in recipients)
            {
                var ok = await _emailService.SendEmailAsync(email, subject, body, _currentUser.TenantId);
                if (!ok) errors.Add($"Falló envío a {email}");
            }

            if (errors.Count > 0)
                return StatusCode(500, new { message = "Algunos envíos fallaron.", errors });

            var responseMessage = realIncident is not null
                ? $"Alerta de prueba enviada con datos reales de {realIncident.Title}."
                : $"Alerta de prueba enviada correctamente. Tipo simulado: {typeLabel}.";
            return Ok(new { message = responseMessage, recipients, simulatedType = alertType, realIncident = realIncident is not null });
        }
    }
}
