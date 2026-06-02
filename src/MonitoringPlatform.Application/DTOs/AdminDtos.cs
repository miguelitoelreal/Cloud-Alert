using System;
using System.ComponentModel.DataAnnotations;

namespace MonitoringPlatform.Application.DTOs
{
    public class CreateUserRequestDto
    {
        [Required, MaxLength(120)]
        public string Name { get; set; } = string.Empty;

        [Required, EmailAddress, MaxLength(256)]
        public string Email { get; set; } = string.Empty;

        [Required, MinLength(8), MaxLength(100)]
        public string Password { get; set; } = string.Empty;

        public bool IsAdmin { get; set; }
    }

    public class UpdateUserRequestDto
    {
        [MaxLength(120)]
        public string? Name { get; set; }

        [EmailAddress, MaxLength(256)]
        public string? Email { get; set; }

        public bool? IsAdmin { get; set; }
    }

    public class UserListItemDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public bool IsAdmin { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class TenantEmailConfigDto
    {
        public string SmtpHost { get; set; } = string.Empty;
        public int SmtpPort { get; set; } = 587;
        public string SmtpUsername { get; set; } = string.Empty;
        public string SmtpPassword { get; set; } = string.Empty;
        public string SenderEmail { get; set; } = string.Empty;
        public string SenderName { get; set; } = string.Empty;
        public bool UseSsl { get; set; } = true;
        public bool EmailEnabled { get; set; } = false;
        public string EmailProvider { get; set; } = "Smtp";
        public string BrevoApiKey { get; set; } = string.Empty;
    }
}
