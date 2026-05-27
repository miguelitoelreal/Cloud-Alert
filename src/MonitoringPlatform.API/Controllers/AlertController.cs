using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.API.Services;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;
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

        public AlertController(
            IAlertRuleRepository ruleRepository,
            IAlertHistoryRepository historyRepository,
            ICurrentUserContext currentUser,
            UserAlertPreferenceService preferenceService,
            AppDbContext dbContext,
            IEmailService emailService)
        {
            _ruleRepository = ruleRepository;
            _historyRepository = historyRepository;
            _currentUser = currentUser;
            _preferenceService = preferenceService;
            _dbContext = dbContext;
            _emailService = emailService;
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
            var preferences = await _preferenceService.GetMyPreferencesAsync(cancellationToken);
            return Ok(preferences);
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
            var providers = await _dbContext.CloudProviders
                .AsNoTracking()
                .Where(c => c.TenantId == _currentUser.TenantId && c.IsEnabled)
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

            // Get selected cloud provider names
            var providerNames = new List<string>();
            if (pref.SelectedCloudProviderIds?.Any() == true)
            {
                providerNames = await _dbContext.CloudProviders
                    .AsNoTracking()
                    .Where(p => p.TenantId == _currentUser.TenantId && pref.SelectedCloudProviderIds.Contains(p.Id))
                    .Select(p => p.Name)
                    .ToListAsync(cancellationToken);
            }

            // Build realistic alert details based on preferences
            var alertDetails = new List<string>();
            if (alertType == "critical" && providerNames.Any())
            {
                var provider = providerNames[new Random().Next(providerNames.Count)];
                alertDetails.Add($"Se ha detectado una incidencia crítica en <strong>{provider}</strong>.");
                alertDetails.Add("Estado: Investigating");
                alertDetails.Add("Impacto: Servicios afectados en múltiples regiones.");
            }
            else if (alertType == "major" && providerNames.Any())
            {
                var provider = providerNames[new Random().Next(providerNames.Count)];
                alertDetails.Add($"Se ha detectado una incidencia mayor en <strong>{provider}</strong>.");
                alertDetails.Add("Estado: Identified");
                alertDetails.Add("Impacto: Degradación de servicios en región US-East.");
            }
            else
            {
                alertDetails.Add("El monitor <strong>API Gateway Production</strong> ha dejado de responder.");
                alertDetails.Add("Estado: DOWN");
                alertDetails.Add("Código HTTP: 0 (Timeout)");
                alertDetails.Add("Tiempo de respuesta: --");
            }

            var providerList = providerNames.Any()
                ? string.Join(", ", providerNames)
                : "Ninguno seleccionado";

            var preferencesSummary = new List<string>();
            if (pref.MonitorDownAlerts) preferencesSummary.Add("Monitores caídos");
            if (pref.CloudIncidentCriticalAlerts) preferencesSummary.Add("Incidencias críticas cloud");
            if (pref.CloudIncidentMajorAlerts) preferencesSummary.Add("Incidencias mayores cloud");
            if (pref.SummaryEnabled) preferencesSummary.Add($"Resumen {pref.SummaryFrequency.ToString().ToLowerInvariant()}");

            var subject = $"[PRUEBA] {typeLabel} - Cloud Alert Hub";
            var body = $@"<html>
<body style='font-family:Segoe UI, Arial, sans-serif; color:#1f2937; background:#f3f4f6; padding:24px;'>
<div style='max-width:600px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.05);'>
  <div style='background:linear-gradient(135deg,#2563eb,#1d4ed8); padding:24px; color:#ffffff;'>
    <h1 style='margin:0; font-size:20px;'>Alerta de prueba</h1>
    <p style='margin:8px 0 0; opacity:0.9; font-size:14px;'>Cloud Alert Hub</p>
  </div>
  <div style='padding:24px;'>
    <div style='background:#fef2f2; border-left:4px solid #ef4444; padding:16px; border-radius:8px; margin-bottom:20px;'>
      <h2 style='margin:0 0 8px; color:#b91c1c; font-size:18px;'>{typeLabel}</h2>
      <p style='margin:0; color:#7f1d1d; font-size:13px;'>Este es un correo de prueba basado en tus preferencias de notificación.</p>
    </div>

    <h3 style='font-size:15px; color:#374151; margin:0 0 12px;'>Detalles de la alerta simulada</h3>
    <div style='background:#f9fafb; padding:16px; border-radius:8px; margin-bottom:20px;'>
      {string.Join("\n      ", alertDetails.Select(d => $"<p style='margin:0 0 8px; font-size:14px; color:#4b5563;'>{d}</p>"))}
      <p style='margin:8px 0 0; font-size:13px; color:#6b7280;'><strong>Hora:</strong> {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</p>
    </div>

    <h3 style='font-size:15px; color:#374151; margin:0 0 12px;'>Tus preferencias activas</h3>
    <div style='background:#f9fafb; padding:16px; border-radius:8px; margin-bottom:20px;'>
      <p style='margin:0 0 8px; font-size:14px; color:#4b5563;'><strong>Alertas configuradas:</strong> {(preferencesSummary.Any() ? string.Join(", ", preferencesSummary) : "Ninguna")}</p>
      <p style='margin:0 0 8px; font-size:14px; color:#4b5563;'><strong>Proveedores cloud seleccionados:</strong> {providerList}</p>
      <p style='margin:0; font-size:14px; color:#4b5563;'><strong>Emails adicionales:</strong> {(pref.AdditionalEmails?.Any() == true ? string.Join(", ", pref.AdditionalEmails) : "Ninguno")}</p>
    </div>

    <div style='border-top:1px solid #e5e7eb; padding-top:16px;'>
      <p style='margin:0; font-size:13px; color:#6b7280;'>Si recibiste este correo, tu configuración de notificaciones está funcionando correctamente. Las alertas reales se enviarán cuando se detecten incidencias que coincidan con tus preferencias.</p>
    </div>
  </div>
  <div style='background:#f9fafb; padding:16px 24px; border-top:1px solid #e5e7eb;'>
    <p style='margin:0; font-size:12px; color:#9ca3af;'>Cloud Alert Hub | {tenant?.Name ?? "MonitoringPlatform"} | Enviado a {user.Email}</p>
  </div>
</div>
</body>
</html>";

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

            return Ok(new { message = $"Alerta de prueba enviada correctamente. Tipo simulado: {typeLabel}.", recipients, simulatedType = alertType });
        }
    }
}
