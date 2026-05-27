namespace MonitoringPlatform.Domain.Entities
{
    public enum AutomationTriggerType
    {
        MonitorDown = 1,
        CloudIncidentActive = 2,
        CloudIncidentResolved = 3,
        CertificateExpiring = 4,
        HighLatency = 5,
        Scheduled = 6,
    }

    public enum AutomationActionType
    {
        SendEmail = 1,
        SendWebhook = 2,
        NotifyChannel = 3,
        Escalate = 4,
    }

    public class AutomationRule
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public string Name { get; set; } = null!;
        public AutomationTriggerType TriggerType { get; set; }
        public string ConditionJson { get; set; } = null!;
        public AutomationActionType ActionType { get; set; }
        public string ActionConfigJson { get; set; } = null!;
        public bool IsEnabled { get; set; } = false;
        public DateTime? LastTriggeredAt { get; set; }
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAtUtc { get; set; }
        public Guid? CreatedByUserId { get; set; }
        public Guid? UpdatedByUserId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public Tenant Tenant { get; set; } = null!;
    }
}
