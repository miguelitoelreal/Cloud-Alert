using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.DTOs.Microsoft;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Infrastructure.Persistence;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.API.Services;

namespace MonitoringPlatform.API.Controllers;

[ApiController]
[Route("api/microsoft-integration")]
[Authorize]
public class MicrosoftIntegrationsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentUserContext _currentUser;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly MicrosoftGraphTenantService _graphService;

    public MicrosoftIntegrationsController(
        AppDbContext context,
        ICurrentUserContext currentUser,
        IHttpClientFactory httpClientFactory,
        MicrosoftGraphTenantService graphService)
    {
        _context = context;
        _currentUser = currentUser;
        _httpClientFactory = httpClientFactory;
        _graphService = graphService;
    }

    [HttpGet]
    public async Task<ActionResult<MicrosoftIntegrationResponse>> Get()
    {
        if (!_currentUser.IsAuthenticated)
        {
            return Unauthorized();
        }

        var integration = await _context.MicrosoftIntegrations
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.TenantId == _currentUser.TenantId);

        if (integration == null)
        {
            return Ok(new MicrosoftIntegrationResponse
            {
                Configured = false
            });
        }

        return Ok(new MicrosoftIntegrationResponse
        {
            Configured = true,
            MicrosoftTenantId = integration.MicrosoftTenantId
        });
    }

    [HttpPost]
    public async Task<IActionResult> Save(
        [FromBody] SaveMicrosoftIntegrationRequest request)
    {
        if (!_currentUser.IsAuthenticated)
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(request.MicrosoftTenantId) ||
            string.IsNullOrWhiteSpace(request.ClientId) ||
            string.IsNullOrWhiteSpace(request.ClientSecret))
        {
            return BadRequest("Todos los campos son obligatorios.");
        }

        var integration = await _context.MicrosoftIntegrations
            .FirstOrDefaultAsync(x => x.TenantId == _currentUser.TenantId);

        if (integration == null)
        {
            integration = new MicrosoftIntegration
            {
                Id = Guid.NewGuid(),
                TenantId = _currentUser.TenantId,
                CreatedAtUtc = DateTime.UtcNow
            };

            _context.MicrosoftIntegrations.Add(integration);
        }

        integration.MicrosoftTenantId = request.MicrosoftTenantId.Trim();
        integration.ClientId = request.ClientId.Trim();
        integration.ClientSecret = request.ClientSecret.Trim();

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete]
    public async Task<IActionResult> Delete()
    {
        if (!_currentUser.IsAuthenticated)
        {
            return Unauthorized();
        }

        var integration = await _context.MicrosoftIntegrations
            .FirstOrDefaultAsync(x => x.TenantId == _currentUser.TenantId);

        if (integration == null)
        {
            return NotFound();
        }

        _context.MicrosoftIntegrations.Remove(integration);

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("test-connection")]
    public async Task<IActionResult> TestConnection()
    {
        if (!_currentUser.IsAuthenticated)
        {
            return Unauthorized();
        }

        var integration = await _context.MicrosoftIntegrations
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.TenantId == _currentUser.TenantId);

        if (integration == null)
        {
            return BadRequest("No hay credenciales configuradas.");
        }

        var tokenUrl = $"https://login.microsoftonline.com/{integration.MicrosoftTenantId}/oauth2/v2.0/token";
        var client = _httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, tokenUrl)
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "client_credentials",
                ["client_id"] = integration.ClientId,
                ["client_secret"] = integration.ClientSecret,
                ["scope"] = "https://graph.microsoft.com/.default",
            }),
        };

        using var response = await client.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var payload = await response.Content.ReadAsStringAsync();
            var backendStatus = response.StatusCode == System.Net.HttpStatusCode.Unauthorized
                ? StatusCodes.Status400BadRequest
                : (int)response.StatusCode;
            return StatusCode(backendStatus, new { message = "No se pudo conectar con Microsoft Graph. Verifica TenantId, ClientId, ClientSecret y que la aplicación tenga permiso ServiceHealth.Read.All con consentimiento de administrador.", details = payload });
        }

        var json = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(json);
        var accessToken = document.RootElement.TryGetProperty("access_token", out var tokenElement)
            ? tokenElement.GetString()
            : null;

        if (string.IsNullOrWhiteSpace(accessToken))
        {
            return BadRequest(new { message = "Microsoft Graph no devolvió un token válido." });
        }

        return Ok(new { connected = true, message = "Conexión exitosa con Microsoft Graph." });
    }

    [HttpGet("incidents")]
    public async Task<ActionResult<IReadOnlyList<MicrosoftGraphIncidentDto>>> GetIncidents()
    {
        if (!_currentUser.IsAuthenticated)
        {
            return Unauthorized();
        }

        var integration = await _context.MicrosoftIntegrations
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.TenantId == _currentUser.TenantId);

        if (integration == null)
        {
            return BadRequest("No hay credenciales configuradas.");
        }

        try
        {
            var incidents = await _graphService.GetIncidentsAsync(
                integration.MicrosoftTenantId,
                integration.ClientId,
                integration.ClientSecret,
                CancellationToken.None);

            return Ok(incidents);
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { message = ex.Message });
        }
    }
}