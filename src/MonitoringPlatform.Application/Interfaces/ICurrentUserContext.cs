namespace MonitoringPlatform.Application.Interfaces
{
    public interface ICurrentUserContext
    {
        Guid UserId { get; }
        Guid TenantId { get; }
        string TenantSlug { get; }
        bool IsAuthenticated { get; }
    }
}
