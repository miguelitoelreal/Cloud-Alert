using System.Security.Claims;
using MonitoringPlatform.Application.Interfaces;

namespace MonitoringPlatform.API.Services
{
    public class CurrentUserContext : ICurrentUserContext
    {
        public const string TenantIdClaimType = "tenantId";
        public const string TenantSlugClaimType = "tenantSlug";

        private readonly IHttpContextAccessor _httpContextAccessor;

        public CurrentUserContext(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public Guid UserId
        {
            get
            {
                var claimValue = User?.FindFirstValue(ClaimTypes.NameIdentifier) ?? User?.FindFirstValue(ClaimTypes.Name);
                return Guid.TryParse(claimValue, out var userId)
                    ? userId
                    : throw new UnauthorizedAccessException("No se encontró un usuario autenticado válido.");
            }
        }

        public Guid TenantId
        {
            get
            {
                var claimValue = User?.FindFirstValue(TenantIdClaimType);
                return Guid.TryParse(claimValue, out var tenantId)
                    ? tenantId
                    : throw new UnauthorizedAccessException("No se encontró un tenant autenticado válido.");
            }
        }

        public string TenantSlug => User?.FindFirstValue(TenantSlugClaimType) ?? throw new UnauthorizedAccessException("No se encontró el workspace autenticado.");

        public bool IsAuthenticated => User?.Identity?.IsAuthenticated == true;

        private ClaimsPrincipal? User => _httpContextAccessor.HttpContext?.User;
    }
}
