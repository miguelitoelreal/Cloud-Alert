using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Infrastructure.Persistence;
using MonitoringPlatform.Application.Interfaces;

namespace MonitoringPlatform.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentUserContext _currentUser;

    public NotificationsController(AppDbContext context, ICurrentUserContext currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount(CancellationToken cancellationToken)
    {
        var count = await _context.UserNotifications
            .Where(n => n.UserId == _currentUser.UserId && !n.IsRead)
            .CountAsync(cancellationToken);

        return Ok(new { count });
    }

    [HttpPost("{id}/mark-read")]
    public async Task<IActionResult> MarkAsRead(Guid id, CancellationToken cancellationToken)
    {
        var notification = await _context.UserNotifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == _currentUser.UserId, cancellationToken);

        if (notification == null)
        {
            return NotFound();
        }

        notification.IsRead = true;
        notification.ReadAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return Ok();
    }

    [HttpPost("mark-all-read")]
    public async Task<IActionResult> MarkAllAsRead(CancellationToken cancellationToken)
    {
        var notifications = await _context.UserNotifications
            .Where(n => n.UserId == _currentUser.UserId && !n.IsRead)
            .ToListAsync(cancellationToken);

        foreach (var notification in notifications)
        {
            notification.IsRead = true;
            notification.ReadAtUtc = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { count = notifications.Count });
    }

    [HttpPost("create")]
    public async Task<IActionResult> CreateNotification(
        [FromBody] CreateNotificationRequest request,
        CancellationToken cancellationToken)
    {
        var user = await _context.Users.FindAsync(new object[] { _currentUser.UserId }, cancellationToken);
        if (user == null)
        {
            return NotFound();
        }

        var notification = new Domain.Entities.UserNotification
        {
            Id = Guid.NewGuid(),
            UserId = _currentUser.UserId,
            TenantId = user.TenantId,
            NotificationType = request.NotificationType,
            ResourceId = request.ResourceId,
            ResourceTitle = request.ResourceTitle,
            ResourceUrl = request.ResourceUrl,
            IsRead = false,
            CreatedAtUtc = DateTime.UtcNow,
        };

        _context.UserNotifications.Add(notification);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { id = notification.Id });
    }

    public class CreateNotificationRequest
    {
        public string NotificationType { get; set; } = string.Empty;
        public string? ResourceId { get; set; }
        public string? ResourceTitle { get; set; }
        public string? ResourceUrl { get; set; }
    }
}
