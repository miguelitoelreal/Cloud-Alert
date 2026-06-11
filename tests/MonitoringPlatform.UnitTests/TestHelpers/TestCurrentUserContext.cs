using MonitoringPlatform.Application.Interfaces;

namespace MonitoringPlatform.UnitTests.TestHelpers;

public sealed class TestCurrentUserContext : ICurrentUserContext
{
    public TestCurrentUserContext(Guid tenantId, Guid? userId = null, string tenantSlug = "test-workspace")
    {
        TenantId = tenantId;
        UserId = userId ?? Guid.NewGuid();
        TenantSlug = tenantSlug;
    }

    public Guid UserId { get; }
    public Guid TenantId { get; }
    public string TenantSlug { get; }
    public bool IsAuthenticated => true;
}
