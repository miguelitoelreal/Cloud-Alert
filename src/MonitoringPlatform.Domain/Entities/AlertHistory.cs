using System;

namespace MonitoringPlatform.Domain.Entities
{
    public class AlertHistory
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Guid? AlertRuleId { get; set; }
        public AlertType AlertType { get; set; }
        public AlertChannel Channel { get; set; }
        public string Subject { get; set; } = null!;
        public string Message { get; set; } = null!;
        public string RecipientEmail { get; set; } = null!;
        public DateTime SentAt { get; set; }
        public bool IsSuccess { get; set; }
        public string? ErrorMessage { get; set; }

        public Tenant Tenant { get; set; } = null!;
        public AlertRule? AlertRule { get; set; }
    }
}
