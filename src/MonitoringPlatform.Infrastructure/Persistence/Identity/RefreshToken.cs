namespace MonitoringPlatform.Infrastructure.Persistence.Identity
{
    public class RefreshToken
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string TokenHash { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? RevokedAt { get; set; }
        public string? ReplacedByTokenHash { get; set; }

        public ApplicationUser User { get; set; } = null!;

        public bool IsActive => RevokedAt is null && ExpiresAt > DateTime.UtcNow;
    }
}
