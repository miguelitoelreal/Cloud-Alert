using System;

namespace MonitoringPlatform.Domain.Entities
{
    public enum AlertType
    {
        MonitorDown = 1,
        CloudIncidentCritical = 2,
        CloudIncidentMajor = 3,
        MonitorRecovered = 4,
        HighLatency = 5,
        CertificateExpiring = 6,
        CertificateExpired = 7,
        CloudIncidentMinor = 8,
        ScheduledMaintenance = 9,
        IncidentResolved = 10,
        IntegrationError = 11,
        CloudImportFailure = 12,
        BackgroundJobFailure = 13,
        Test = 99,
    }

    public enum AlertChannel
    {
        Email = 1,
        Webhook = 2,
    }

    public class AlertRule
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public string Name { get; set; } = null!;
        public AlertType AlertType { get; set; }
        public AlertChannel Channel { get; set; }
        public bool IsEnabled { get; set; } = true;
        public int ThrottleMinutes { get; set; } = 15;
        public string RecipientEmails { get; set; } = string.Empty;
        public string SelectedCloudProviderIds { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public Tenant Tenant { get; set; } = null!;

        public List<string> GetRecipientEmails()
        {
            if (string.IsNullOrWhiteSpace(RecipientEmails)) return new List<string>();
            var emails = new List<string>();
            foreach (var part in RecipientEmails.Split(',', StringSplitOptions.RemoveEmptyEntries))
            {
                var trimmed = part.Trim();
                if (!string.IsNullOrWhiteSpace(trimmed)) emails.Add(trimmed);
            }
            return emails;
        }

        public void SetRecipientEmails(IEnumerable<string> emails)
        {
            RecipientEmails = string.Join(",", emails);
        }

        public List<Guid> GetSelectedProviderIds()
        {
            if (string.IsNullOrWhiteSpace(SelectedCloudProviderIds)) return new List<Guid>();
            var ids = new List<Guid>();
            foreach (var part in SelectedCloudProviderIds.Split(',', StringSplitOptions.RemoveEmptyEntries))
            {
                if (Guid.TryParse(part.Trim(), out var id)) ids.Add(id);
            }
            return ids;
        }

        public void SetSelectedProviderIds(IEnumerable<Guid> ids)
        {
            SelectedCloudProviderIds = string.Join(",", ids);
        }
    }
}
