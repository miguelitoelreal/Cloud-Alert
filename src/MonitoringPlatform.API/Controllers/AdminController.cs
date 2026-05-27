using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MonitoringPlatform.API.Services;
using MonitoringPlatform.Application.DTOs;

namespace MonitoringPlatform.API.Controllers
{
    [ApiController]
    [Route("api/admin")]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly AdminService _adminService;

        public AdminController(AdminService adminService)
        {
            _adminService = adminService;
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetUsers(CancellationToken cancellationToken)
        {
            var users = await _adminService.GetUsersAsync(cancellationToken);
            return Ok(users);
        }

        [HttpPost("users")]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserRequestDto request, CancellationToken cancellationToken)
        {
            var user = await _adminService.CreateUserAsync(request, cancellationToken);
            return Ok(user);
        }

        [HttpPut("users/{id:guid}")]
        public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserRequestDto request, CancellationToken cancellationToken)
        {
            await _adminService.UpdateUserAsync(id, request, cancellationToken);
            return NoContent();
        }

        [HttpDelete("users/{id:guid}")]
        public async Task<IActionResult> DeleteUser(Guid id, CancellationToken cancellationToken)
        {
            await _adminService.DeleteUserAsync(id, cancellationToken);
            return NoContent();
        }

        [HttpGet("email-config")]
        public async Task<IActionResult> GetEmailConfig(CancellationToken cancellationToken)
        {
            var config = await _adminService.GetEmailConfigAsync(cancellationToken);
            return Ok(config);
        }

        [HttpPut("email-config")]
        public async Task<IActionResult> UpdateEmailConfig([FromBody] TenantEmailConfigDto request, CancellationToken cancellationToken)
        {
            await _adminService.UpdateEmailConfigAsync(request, cancellationToken);
            return NoContent();
        }
    }
}
