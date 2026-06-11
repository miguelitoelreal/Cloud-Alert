namespace MonitoringPlatform.API.Configurations
{
    public class EmailOptions
    {
        public bool Enabled { get; set; }
        public string SmtpHost { get; set; } = "smtp.gmail.com";
        public int SmtpPort { get; set; } = 587;
        public string SmtpUsername { get; set; } = string.Empty;
        public string SmtpPassword { get; set; } = string.Empty;
        public string SenderEmail { get; set; } = string.Empty;
        public string SenderName { get; set; } = "Cloud Alert Hub";
        public bool UseSsl { get; set; } = true;
        public string EmailProvider { get; set; } = "Smtp";
        public string BrevoApiKey { get; set; } = string.Empty;
    }
}
