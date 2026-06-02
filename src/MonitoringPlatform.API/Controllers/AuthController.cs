using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MonitoringPlatform.API.Services;
using MonitoringPlatform.Application.DTOs;

namespace MonitoringPlatform.API.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;

        public AuthController(AuthService authService)
        {
            _authService = authService;
        }

        [AllowAnonymous]
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDto request, CancellationToken cancellationToken)
        {
            try
            {
                var result = await _authService.RegisterAsync(request, cancellationToken);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(CreateProblem(StatusCodes.Status400BadRequest, "Registro inválido", ex.Message));
            }
        }

        [AllowAnonymous]
        [EnableRateLimiting("auth")]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto request, CancellationToken cancellationToken)
        {
            try
            {
                var result = await _authService.LoginAsync(request, cancellationToken);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(CreateProblem(StatusCodes.Status401Unauthorized, "Credenciales inválidas", ex.Message));
            }
        }

        [AllowAnonymous]
        [EnableRateLimiting("auth")]
        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequestDto request, CancellationToken cancellationToken)
        {
            try
            {
                var result = await _authService.RefreshAsync(request.RefreshToken, cancellationToken);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(CreateProblem(StatusCodes.Status401Unauthorized, "Sesión inválida", ex.Message));
            }
        }

        [Authorize]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout([FromBody] LogoutRequestDto request, CancellationToken cancellationToken)
        {
            var userId = GetUserId();
            if (userId is null)
            {
                return Unauthorized(CreateProblem(StatusCodes.Status401Unauthorized, "No autenticado", "No se encontró un usuario autenticado."));
            }

            await _authService.LogoutAsync(userId.Value, request.RefreshToken, cancellationToken);
            return NoContent();
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> Me()
        {
            var userId = GetUserId();
            if (userId is null)
            {
                return Unauthorized(CreateProblem(StatusCodes.Status401Unauthorized, "No autenticado", "No se encontró un usuario autenticado."));
            }

            var user = await _authService.GetCurrentUserAsync(userId.Value);
            if (user is null)
            {
                return Unauthorized(CreateProblem(StatusCodes.Status401Unauthorized, "No autenticado", "La sesión actual ya no es válida."));
            }

            return Ok(user);
        }

        [Authorize]
        [HttpPut("me")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequestDto request, CancellationToken cancellationToken)
        {
            var userId = GetUserId();
            if (userId is null)
            {
                return Unauthorized(CreateProblem(StatusCodes.Status401Unauthorized, "No autenticado", "No se encontró un usuario autenticado."));
            }

            try
            {
                var user = await _authService.UpdateProfileAsync(userId.Value, request, cancellationToken);
                return Ok(user);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(CreateProblem(StatusCodes.Status400BadRequest, "Actualización inválida", ex.Message));
            }
        }

        [Authorize]
        [HttpPut("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequestDto request, CancellationToken cancellationToken)
        {
            var userId = GetUserId();
            if (userId is null)
            {
                return Unauthorized(CreateProblem(StatusCodes.Status401Unauthorized, "No autenticado", "No se encontró un usuario autenticado."));
            }

            try
            {
                await _authService.ChangePasswordAsync(userId.Value, request, cancellationToken);
                return NoContent();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(CreateProblem(StatusCodes.Status400BadRequest, "Cambio de contraseña inválido", ex.Message));
            }
        }

        private Guid? GetUserId()
        {
            var claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(ClaimTypes.Name);
            return Guid.TryParse(claimValue, out var userId) ? userId : null;
        }

        private ProblemDetails CreateProblem(int status, string title, string detail)
        {
            return new ProblemDetails
            {
                Status = status,
                Title = title,
                Detail = detail,
                Instance = HttpContext.Request.Path,
            };
        }
    }
}
