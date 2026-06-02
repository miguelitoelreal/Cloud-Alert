using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace MonitoringPlatform.API.Hubs
{
    [Authorize]
    public class MonitoringHub : Hub
    {
        private const string TenantGroupPrefix = "tenant-";

        public override async Task OnConnectedAsync()
        {
            var tenantId = Context.User?.FindFirstValue("tenant_id");
            if (!string.IsNullOrEmpty(tenantId))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"{TenantGroupPrefix}{tenantId}");
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var tenantId = Context.User?.FindFirstValue("tenant_id");
            if (!string.IsNullOrEmpty(tenantId))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"{TenantGroupPrefix}{tenantId}");
            }
            await base.OnDisconnectedAsync(exception);
        }
    }
}
