using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Domain.Enums;

namespace MonitoringPlatform.API.Services
{
    public class EmailTemplateRenderer : IEmailTemplateRenderer
    {
        private static string GetTenantName(UserAlertPreference pref, string fallback) =>
            !string.IsNullOrWhiteSpace(pref.CustomTenantName) ? pref.CustomTenantName : fallback;

        private static bool IsEnglish(UserAlertPreference pref) => pref.Language == NotificationLanguage.English;

        private static string GetColor(UserAlertPreference pref) =>
            !string.IsNullOrWhiteSpace(pref.CustomTenantColor) ? pref.CustomTenantColor : "#2563eb";

        private static string GetLogo(UserAlertPreference pref) =>
            !string.IsNullOrWhiteSpace(pref.CustomTenantLogoUrl)
                ? $"<img src='{pref.CustomTenantLogoUrl}' alt='Logo' style='max-height:32px;margin-bottom:8px;' /><br/>"
                : "";

        private static string Header(UserAlertPreference pref, string title, string tenantName) =>
@$"<div style='background:{GetColor(pref)};padding:24px;color:#ffffff;'>
    {GetLogo(pref)}
    <h1 style='margin:0;font-size:20px;'>{title}</h1>
    <p style='margin:8px 0 0;opacity:0.9;font-size:14px;'>{GetTenantName(pref, tenantName)}</p>
</div>";

        private static string Footer(UserAlertPreference pref, string tenantName)
        {
            var name = GetTenantName(pref, tenantName);
            var isEn = IsEnglish(pref);
            var sentBy = isEn ? "Sent by MonitoringPlatform" : "Enviado por MonitoringPlatform";
            return $"<div style='background:#f9fafb;padding:16px 24px;border-top:1px solid #e5e7eb;'><p style='margin:0;font-size:12px;color:#9ca3af;'>{name} | {sentBy}</p></div>";
        }

        public Task<(string subject, string body)> RenderMonitorDownAsync(UserAlertPreference pref, string monitorName, string monitorUrl, string? errorMessage, string tenantName)
        {
            var isEn = IsEnglish(pref);
            var subject = isEn ? $"🚨 Alert: Monitor down – {monitorName}" : $"🚨 Alerta: Monitor caído – {monitorName}";

            var details = new List<string>();
            if (pref.IncludeCurrentStatus)
                details.Add($"<li><strong>{(isEn ? "Status" : "Estado")}:</strong> Offline</li>");
            details.Add($"<li><strong>URL:</strong> {monitorUrl}</li>");
            if (pref.IncludeMetrics)
                details.Add($"<li><strong>{(isEn ? "Error" : "Error")}:</strong> {errorMessage ?? (isEn ? "No details" : "Sin detalle")}</li>");
            details.Add($"<li><strong>{(isEn ? "Time" : "Hora")}:</strong> {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</li>");

            var directLink = pref.IncludeDirectLinks
                ? $"<p><a href='https://localhost:5173/dashboard'>{(isEn ? "Open Monitoring Dashboard" : "Accede al Centro de Monitoreo")}</a></p>"
                : "";

            var body = Wrap(pref, tenantName, subject, isEn ? "Monitor Alert" : "Alerta de Monitor",
@$"<div style='background:#fef2f2;border-left:4px solid #ef4444;padding:16px;border-radius:8px;margin-bottom:20px;'>
    <h2 style='margin:0 0 8px;color:#b91c1c;font-size:18px;'>{monitorName}</h2>
    <p style='margin:0;color:#7f1d1d;font-size:13px;'>{(isEn ? "The monitor has gone offline." : "El monitor ha cambiado a estado Offline.")}</p>
</div>
<h3 style='font-size:15px;color:#374151;margin:0 0 12px;'>{(isEn ? "Details" : "Detalles")}</h3>
<div style='background:#f9fafb;padding:16px;border-radius:8px;margin-bottom:20px;'>
    <ul style='margin:0;padding-left:18px;font-size:14px;color:#4b5563;'>
        {string.Join("\n        ", details)}
    </ul>
</div>
{directLink}");

            return Task.FromResult((subject, body));
        }

        public Task<(string subject, string body)> RenderMonitorRecoveredAsync(UserAlertPreference pref, string monitorName, string monitorUrl, string tenantName)
        {
            var isEn = IsEnglish(pref);
            var subject = isEn ? $"✅ Monitor recovered – {monitorName}" : $"✅ Monitor recuperado – {monitorName}";

            var body = Wrap(pref, tenantName, subject, isEn ? "Monitor Recovered" : "Monitor Recuperado",
@$"<div style='background:#f0fdf4;border-left:4px solid #22c55e;padding:16px;border-radius:8px;margin-bottom:20px;'>
    <h2 style='margin:0 0 8px;color:#15803d;font-size:18px;'>{monitorName}</h2>
    <p style='margin:0;color:#166534;font-size:13px;'>{(isEn ? "The monitor is back online." : "El monitor ha vuelto a estar activo.")}</p>
</div>
<p style='font-size:14px;color:#4b5563;'><strong>URL:</strong> {monitorUrl}</p>
<p style='font-size:14px;color:#4b5563;'><strong>{(isEn ? "Time" : "Hora")}:</strong> {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</p>");

            return Task.FromResult((subject, body));
        }

        public Task<(string subject, string body)> RenderHighLatencyAsync(UserAlertPreference pref, string monitorName, string monitorUrl, long responseTimeMs, long thresholdMs, string tenantName)
        {
            var isEn = IsEnglish(pref);
            var subject = isEn
                ? $"⚠️ High latency – {monitorName} ({responseTimeMs}ms)"
                : $"⚠️ Latencia alta – {monitorName} ({responseTimeMs}ms)";

            var body = Wrap(pref, tenantName, subject, isEn ? "High Latency Alert" : "Alerta de Latencia Alta",
@$"<div style='background:#fffbeb;border-left:4px solid #f59e0b;padding:16px;border-radius:8px;margin-bottom:20px;'>
    <h2 style='margin:0 0 8px;color:#92400e;font-size:18px;'>{monitorName}</h2>
    <p style='margin:0;color:#78350f;font-size:13px;'>{(isEn ? "Response time exceeded the threshold." : "El tiempo de respuesta superó el umbral.")}</p>
</div>
<p style='font-size:14px;color:#4b5563;'><strong>URL:</strong> {monitorUrl}</p>
<p style='font-size:14px;color:#4b5563;'><strong>{(isEn ? "Response time" : "Tiempo de respuesta")}:</strong> {responseTimeMs}ms</p>
<p style='font-size:14px;color:#4b5563;'><strong>{(isEn ? "Threshold" : "Umbral")}:</strong> {thresholdMs}ms</p>
<p style='font-size:14px;color:#4b5563;'><strong>{(isEn ? "Time" : "Hora")}:</strong> {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</p>");

            return Task.FromResult((subject, body));
        }

        public Task<(string subject, string body)> RenderCloudIncidentAsync(UserAlertPreference pref, string providerName, string incidentTitle, string incidentDescription, CloudIncidentSeverity severity, string tenantName)
        {
            var isEn = IsEnglish(pref);
            var sevLabel = severity switch
            {
                CloudIncidentSeverity.Critical => isEn ? "Critical" : "Crítica",
                CloudIncidentSeverity.Major => isEn ? "Major" : "Mayor",
                CloudIncidentSeverity.Minor => isEn ? "Minor" : "Menor",
                _ => isEn ? "Informational" : "Informativa",
            };

            var subject = $"☁️ {(isEn ? "Cloud Alert" : "Alerta Cloud")} – {providerName}: {incidentTitle}";

            var borderColor = severity switch
            {
                CloudIncidentSeverity.Critical => "#ef4444",
                CloudIncidentSeverity.Major => "#f59e0b",
                CloudIncidentSeverity.Minor => "#3b82f6",
                _ => "#6b7280",
            };
            var bgColor = severity switch
            {
                CloudIncidentSeverity.Critical => "#fef2f2",
                CloudIncidentSeverity.Major => "#fffbeb",
                CloudIncidentSeverity.Minor => "#eff6ff",
                _ => "#f9fafb",
            };
            var titleColor = severity switch
            {
                CloudIncidentSeverity.Critical => "#b91c1c",
                CloudIncidentSeverity.Major => "#92400e",
                CloudIncidentSeverity.Minor => "#1e40af",
                _ => "#374151",
            };
            var badgeBg = severity switch
            {
                CloudIncidentSeverity.Critical => "#dc2626",
                CloudIncidentSeverity.Major => "#d97706",
                CloudIncidentSeverity.Minor => "#2563eb",
                _ => "#4b5563",
            };

            var icon = severity switch
            {
                CloudIncidentSeverity.Critical => "🔴",
                CloudIncidentSeverity.Major => "🟠",
                CloudIncidentSeverity.Minor => "🔵",
                _ => "⚪",
            };

            var directLink = pref.IncludeDirectLinks
                ? $"<a href='https://localhost:5173/centro-estado-cloud' style='display:inline-block;background:{borderColor};color:#ffffff;padding:10px 20px;text-decoration:none;border-radius:6px;font-size:13px;font-weight:500;'>{(isEn ? "View in Cloud Status Center →" : "Ver en Centro de Estado Cloud →")}</a>"
                : "";

            var body = Wrap(pref, tenantName, subject, isEn ? "Cloud Incident" : "Incidencia Cloud",
@$"<div style='background:linear-gradient(135deg,{bgColor} 0%,#ffffff 100%);border:1px solid {borderColor};border-radius:12px;padding:24px;margin-bottom:24px;'>
    <div style='display:flex;align-items:center;gap:12px;margin-bottom:16px;'>
        <span style='font-size:32px;'>{icon}</span>
        <div>
            <h2 style='margin:0;color:{titleColor};font-size:20px;font-weight:600;'>{incidentTitle}</h2>
            <p style='margin:4px 0 0;color:#6b7280;font-size:13px;'>{(isEn ? "A cloud incident has been detected" : "Se ha detectado una incidencia cloud")}</p>
        </div>
    </div>
    <div style='display:inline-block;background:{badgeBg};color:#ffffff;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>{sevLabel}</div>
</div>

<div style='display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;'>
    <div style='background:#f9fafb;padding:16px;border-radius:8px;border:1px solid #e5e7eb;'>
        <p style='margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;'>{(isEn ? "Provider" : "Proveedor")}</p>
        <p style='margin:0;font-size:15px;font-weight:500;color:#1f2937;'>{providerName}</p>
    </div>
    <div style='background:#f9fafb;padding:16px;border-radius:8px;border:1px solid #e5e7eb;'>
        <p style='margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;'>{(isEn ? "Severity" : "Severidad")}</p>
        <p style='margin:0;font-size:15px;font-weight:500;color:{titleColor};'>{sevLabel}</p>
    </div>
</div>

{(pref.IncludeMetrics ? $"<div style='background:#f9fafb;padding:16px;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:24px;'>
    <p style='margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;'>{(isEn ? "Description" : "Descripción")}</p>
    <p style='margin:0;font-size:14px;color:#4b5563;line-height:1.6;'>{incidentDescription}</p>
</div>" : "")}

<div style='background:#f9fafb;padding:16px;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:24px;'>
    <p style='margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;'>{(isEn ? "Detected at" : "Detectado a las")}</p>
    <p style='margin:0;font-size:14px;color:#4b5563;'>{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</p>
</div>

{directLink}");

            return Task.FromResult((subject, body));
        }

        public Task<(string subject, string body)> RenderSummaryDigestAsync(UserAlertPreference pref, string tenantName, AlertHistoryResponseDto[] alerts)
        {
            var isEn = IsEnglish(pref);
            var subject = isEn
                ? $"📋 Summary – {alerts.Length} alert(s)"
                : $"📋 Resumen – {alerts.Length} alerta(s)";

            var rows = new List<string>();
            foreach (var a in alerts)
            {
                rows.Add(
@$"<tr style='border-bottom:1px solid #e5e7eb;'>
    <td style='padding:10px 8px;font-size:13px;color:#374151;'>{a.AlertTypeLabel}</td>
    <td style='padding:10px 8px;font-size:13px;color:#4b5563;'>{a.Subject}</td>
    <td style='padding:10px 8px;font-size:12px;color:#6b7280;'>{a.SentAt:yyyy-MM-dd HH:mm}</td>
</tr>");
            }

            var body = Wrap(pref, tenantName, subject, isEn ? "Alert Summary" : "Resumen de Alertas",
@$"<div style='background:#eff6ff;border-left:4px solid #3b82f6;padding:16px;border-radius:8px;margin-bottom:20px;'>
    <h2 style='margin:0 0 8px;color:#1e40af;font-size:18px;'>{(isEn ? "Alert Summary" : "Resumen de Alertas")}</h2>
    <p style='margin:0;color:#374151;font-size:13px;'>{(isEn ? $"You have {alerts.Length} recent alert(s)." : $"Tienes {alerts.Length} alerta(s) reciente(s).")}</p>
</div>
<table style='width:100%;border-collapse:collapse;font-family:Segoe UI,Arial,sans-serif;'>
    <thead>
        <tr style='border-bottom:2px solid #e5e7eb;'>
            <th style='text-align:left;padding:10px 8px;font-size:12px;color:#6b7280;text-transform:uppercase;'>{(isEn ? "Type" : "Tipo")}</th>
            <th style='text-align:left;padding:10px 8px;font-size:12px;color:#6b7280;text-transform:uppercase;'>{(isEn ? "Subject" : "Asunto")}</th>
            <th style='text-align:left;padding:10px 8px;font-size:12px;color:#6b7280;text-transform:uppercase;'>{(isEn ? "Sent" : "Enviado")}</th>
        </tr>
    </thead>
    <tbody>
        {string.Join("\n    ", rows)}
    </tbody>
</table>");

            return Task.FromResult((subject, body));
        }

        public Task<(string subject, string body)> RenderCertificateExpiringAsync(UserAlertPreference pref, string monitorName, string monitorUrl, int daysRemaining, string tenantName)
        {
            var isEn = IsEnglish(pref);
            var subject = isEn
                ? $"🔒 Certificate expiring soon – {monitorName} ({daysRemaining} days)"
                : $"🔒 Certificado próximo a expirar – {monitorName} ({daysRemaining} días)";

            var body = Wrap(pref, tenantName, subject, isEn ? "Certificate Alert" : "Alerta de Certificado",
@$"<div style='background:#fffbeb;border-left:4px solid #f59e0b;padding:16px;border-radius:8px;margin-bottom:20px;'>
    <h2 style='margin:0 0 8px;color:#92400e;font-size:18px;'>{monitorName}</h2>
    <p style='margin:0;color:#78350f;font-size:13px;'>{(isEn ? $"The SSL certificate expires in {daysRemaining} days." : $"El certificado SSL expira en {daysRemaining} días.")}</p>
</div>
<p style='font-size:14px;color:#4b5563;'><strong>URL:</strong> {monitorUrl}</p>
<p style='font-size:14px;color:#4b5563;'><strong>{(isEn ? "Time" : "Hora")}:</strong> {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</p>");

            return Task.FromResult((subject, body));
        }

        public Task<(string subject, string body)> RenderCertificateExpiredAsync(UserAlertPreference pref, string monitorName, string monitorUrl, string tenantName)
        {
            var isEn = IsEnglish(pref);
            var subject = isEn
                ? $"🔓 Certificate expired – {monitorName}"
                : $"🔓 Certificado expirado – {monitorName}";

            var body = Wrap(pref, tenantName, subject, isEn ? "Certificate Alert" : "Alerta de Certificado",
@$"<div style='background:#fef2f2;border-left:4px solid #ef4444;padding:16px;border-radius:8px;margin-bottom:20px;'>
    <h2 style='margin:0 0 8px;color:#b91c1c;font-size:18px;'>{monitorName}</h2>
    <p style='margin:0;color:#7f1d1d;font-size:13px;'>{(isEn ? "The SSL certificate has expired." : "El certificado SSL ha expirado.")}</p>
</div>
<p style='font-size:14px;color:#4b5563;'><strong>URL:</strong> {monitorUrl}</p>
<p style='font-size:14px;color:#4b5563;'><strong>{(isEn ? "Time" : "Hora")}:</strong> {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</p>");

            return Task.FromResult((subject, body));
        }

        private static string Wrap(UserAlertPreference pref, string tenantName, string subject, string title, string content)
        {
            return @$"<html>
<body style='font-family:Segoe UI,Arial,sans-serif;color:#1f2937;background:#f3f4f6;padding:24px;'>
<div style='max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);'>
    {Header(pref, title, tenantName)}
    <div style='padding:24px;'>
        {content}
    </div>
    {Footer(pref, tenantName)}
</div>
</body>
</html>";
        }
    }
}
