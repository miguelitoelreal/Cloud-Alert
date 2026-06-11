using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MonitoringPlatform.API.Configurations;
using MonitoringPlatform.API.Hubs;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Application.Services;
using MonitoringPlatform.API.Services;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/cloud-status")]
    public class CloudStatusController : ControllerBase
    {
        private readonly CloudStatusService _service;
        private readonly CloudStatusIngestionCoordinator _coordinator;
        private readonly CloudStatusOptions _options;
        private readonly IHubContext<MonitoringHub> _hubContext;
        private readonly ILogger<CloudStatusController> _logger;
        private readonly ICurrentUserContext _currentUser;
        private readonly ICloudStatusAnalyticsService _analyticsService;
        private readonly ICloudImpactAssessmentService _impactService;
        private readonly ICloudIncidentCorrelationService _correlationService;
        private readonly IHealthScoreService _healthScoreService;
        private readonly ICloudProviderDetailService _providerDetailService;
        private readonly ICloudAlertSubscriptionRepository _alertSubscriptionRepo;
        private readonly ISlaDefinitionRepository _slaDefinitionRepo;
        private readonly ISlaReportRepository _slaReportRepo;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly AppDbContext _dbContext;

        public CloudStatusController(
            CloudStatusService service,
            CloudStatusIngestionCoordinator coordinator,
            IOptions<CloudStatusOptions> options,
            IHubContext<MonitoringHub> hubContext,
            ILogger<CloudStatusController> logger,
            ICurrentUserContext currentUser,
            ICloudStatusAnalyticsService analyticsService,
            ICloudImpactAssessmentService impactService,
            ICloudIncidentCorrelationService correlationService,
            IHealthScoreService healthScoreService,
            ICloudProviderDetailService providerDetailService,
            ICloudAlertSubscriptionRepository alertSubscriptionRepo,
            ISlaDefinitionRepository slaDefinitionRepo,
            ISlaReportRepository slaReportRepo,
            IHttpClientFactory httpClientFactory,
            AppDbContext dbContext)
        {
            _service = service;
            _coordinator = coordinator;
            _options = options.Value;
            _hubContext = hubContext;
            _logger = logger;
            _currentUser = currentUser;
            _analyticsService = analyticsService;
            _impactService = impactService;
            _correlationService = correlationService;
            _healthScoreService = healthScoreService;
            _providerDetailService = providerDetailService;
            _alertSubscriptionRepo = alertSubscriptionRepo;
            _slaDefinitionRepo = slaDefinitionRepo;
            _slaReportRepo = slaReportRepo;
            _httpClientFactory = httpClientFactory;
            _dbContext = dbContext;
        }

        [HttpGet("overview")]
        public async Task<IActionResult> GetOverview(
            [FromQuery] string? provider,
            [FromQuery] int? severity,
            [FromQuery] bool activeOnly = false,
            [FromQuery] string? search = null,
            [FromQuery] int take = 100)
        {
            var result = await _service.GetOverviewAsync(new CloudStatusQueryDto
            {
                Provider = provider,
                Severity = severity,
                ActiveOnly = activeOnly,
                Search = search,
                Take = take,
            });

            return Ok(result);
        }

        [HttpGet("trends")]
        public async Task<IActionResult> GetTrends(
            [FromQuery] int days = 30,
            CancellationToken cancellationToken = default)
        {
            var startDate = DateTime.UtcNow.Date.AddDays(-Math.Clamp(days, 7, 90));
            var trends = await _service.GetProviderTrendsAsync(startDate, cancellationToken);
            return Ok(trends);
        }

        [EnableRateLimiting("general")]
        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh(CancellationToken cancellationToken)
        {
            _logger.LogInformation("Manual refresh requested by user {UserId}", _currentUser.UserId);
            
            try
            {
                var result = await _coordinator.IngestAsync(_options.ToSeedDtos(), cancellationToken);

                _logger.LogInformation("Refresh completed: Processed={Processed}, Successful={Successful}, Failed={Failed}, Changed={Changed}",
                    result.ProcessedProviders, result.SuccessfulProviders, result.FailedProviders, result.ChangedIncidents);

                if (result.ChangedIncidents > 0)
                {
                    await _hubContext.Clients.All.SendAsync(
                        "CloudStatusChanged",
                        new
                        {
                            updatedAt = DateTime.UtcNow,
                            changedIncidents = result.ChangedIncidents,
                            source = "manual-refresh",
                        },
                        cancellationToken);
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Manual refresh failed for user {UserId}", _currentUser.UserId);
                return StatusCode(500, new { error = "Error al actualizar el estado cloud", message = ex.Message });
            }
        }

        [EnableRateLimiting("general")]
        [HttpPost("reset-and-ingest")]
        public async Task<IActionResult> ResetAndIngest(CancellationToken cancellationToken)
        {
            _logger.LogInformation("Reset-and-ingest invoked: deleting all cloud incidents and re-ingesting from providers.");

            // Get provider IDs for this tenant
            var tenantProviderIds = await _dbContext.CloudProviders
                .AsNoTracking()
                .Where(p => p.TenantId == _currentUser.TenantId)
                .Select(p => p.Id)
                .ToListAsync(cancellationToken);

            // Remove cloud incidents belonging to this tenant's providers
            var incidentsToDelete = await _dbContext.CloudIncidents
                .Where(i => tenantProviderIds.Contains(i.CloudProviderId))
                .ToListAsync(cancellationToken);
            var incidentIdsToDelete = incidentsToDelete.Select(i => i.Id).ToList();
            _dbContext.CloudIncidents.RemoveRange(incidentsToDelete);
            await _dbContext.SaveChangesAsync(cancellationToken);

            // Remove correlations and groups for this tenant
            var correlationsToDelete = await _dbContext.CloudIncidentCorrelations
                .Where(c => incidentIdsToDelete.Contains(c.CloudIncidentId))
                .ToListAsync(cancellationToken);
            var groupIdsToDelete = correlationsToDelete.Select(c => c.GroupId).Distinct().ToList();
            _dbContext.CloudIncidentCorrelations.RemoveRange(correlationsToDelete);

            var groupsToDelete = await _dbContext.CloudIncidentGroups
                .Where(g => g.TenantId == _currentUser.TenantId || groupIdsToDelete.Contains(g.Id))
                .ToListAsync(cancellationToken);
            _dbContext.CloudIncidentGroups.RemoveRange(groupsToDelete);
            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Deleted {IncidentCount} incidents and {GroupCount} correlation groups for tenant {TenantId}.",
                incidentsToDelete.Count, groupsToDelete.Count, _currentUser.TenantId);

            var result = await _coordinator.IngestAsync(_options.ToSeedDtos(), cancellationToken);

            await _hubContext.Clients.All.SendAsync(
                "CloudStatusChanged",
                new
                {
                    updatedAt = DateTime.UtcNow,
                    changedIncidents = result.ChangedIncidents,
                    source = "reset-and-ingest",
                },
                cancellationToken);

            return Ok(new
            {
                deletedIncidents = incidentsToDelete.Count,
                deletedGroups = groupsToDelete.Count,
                ingestion = result,
            });
        }

        [EnableRateLimiting("translate")]
        [HttpPost("translate")]
        public async Task<IActionResult> TranslateIncident(
            [FromBody] CloudIncidentTranslationRequestDto request,
            [FromServices] CloudStatusTranslationService translationService,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.Title) && string.IsNullOrWhiteSpace(request.Description))
            {
                return BadRequest(new ProblemDetails
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Bad Request",
                    Detail = "Se requiere contenido para traducir.",
                    Instance = HttpContext.Request.Path,
                });
            }

            try
            {
                var result = await translationService.TranslateIncidentAsync(request, cancellationToken);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new ProblemDetails
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Bad Request",
                    Detail = ex.Message,
                    Instance = HttpContext.Request.Path,
                });
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Cloud incident translation failed for incident {IncidentId}.",
                    request.IncidentId ?? "(no-incident-id)");

                return StatusCode(StatusCodes.Status502BadGateway, new ProblemDetails
                {
                    Status = StatusCodes.Status502BadGateway,
                    Title = "Traducción no disponible",
                    Detail = "No se pudo traducir este incidente en este momento. Intenta nuevamente en unos instantes.",
                    Instance = HttpContext.Request.Path,
                });
            }
        }

        [HttpGet("analytics")]
        public async Task<IActionResult> GetAnalytics(
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to,
            CancellationToken cancellationToken)
        {
            var result = await _analyticsService.GetProviderAnalyticsAsync(
                _currentUser.TenantId,
                new CloudStatusAnalyticsRequestDto { From = from, To = to },
                cancellationToken);
            return Ok(result);
        }

        [HttpGet("analytics/{providerSlug}")]
        public async Task<IActionResult> GetProviderAnalytics(
            string providerSlug,
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to,
            CancellationToken cancellationToken)
        {
            var result = await _analyticsService.GetProviderAnalyticsAsync(
                _currentUser.TenantId,
                providerSlug,
                new CloudStatusAnalyticsRequestDto { From = from, To = to },
                cancellationToken);

            if (result is null)
            {
                return NotFound();
            }

            return Ok(result);
        }

        [HttpGet("impact")]
        public async Task<IActionResult> GetImpact(CancellationToken cancellationToken)
        {
            var result = await _impactService.GetActiveImpactsAsync(
                _currentUser.TenantId,
                cancellationToken);
            return Ok(result);
        }

        [HttpGet("correlations")]
        public async Task<IActionResult> GetCorrelations(CancellationToken cancellationToken)
        {
            var result = await _correlationService.GetActiveGroupsAsync(
                _currentUser.TenantId,
                cancellationToken);
            return Ok(result);
        }

        [HttpPost("correlate")]
        public async Task<IActionResult> TriggerCorrelation(CancellationToken cancellationToken)
        {
            var result = await _correlationService.DetectAndGroupAsync(
                _currentUser.TenantId,
                cancellationToken);
            return Ok(result);
        }

        [HttpGet("health-score")]
        public async Task<IActionResult> GetHealthScore(CancellationToken cancellationToken)
        {
            var score = await _healthScoreService.CalculateTenantScoreAsync(
                _currentUser.TenantId,
                cancellationToken);
            return Ok(new { score, calculatedAt = DateTime.UtcNow });
        }

        [HttpGet("providers/{slug}")]
        public async Task<IActionResult> GetProviderDetail(
            string slug,
            CancellationToken cancellationToken)
        {
            var result = await _providerDetailService.GetProviderDetailAsync(
                _currentUser.TenantId,
                slug,
                cancellationToken);

            if (result is null)
            {
                return NotFound();
            }

            return Ok(result);
        }

        // ─── Alert Subscriptions ──────────────────────────────────────────

        [HttpGet("subscriptions")]
        public async Task<IActionResult> GetSubscriptions(CancellationToken cancellationToken)
        {
            var items = await _alertSubscriptionRepo.GetByTenantAsync(_currentUser.TenantId, cancellationToken);
            var dtos = items.Select(x => new CloudAlertSubscriptionDto
            {
                Id = x.Id,
                Name = x.Name,
                MinSeverity = x.MinSeverity,
                IsEnabled = x.IsEnabled,
                QuietHoursEnabled = x.QuietHoursEnabled,
                QuietHoursStart = x.QuietHoursStart,
                QuietHoursEnd = x.QuietHoursEnd,
                QuietHoursTimezone = x.QuietHoursTimezone,
                QuietHoursExcludeWeekends = x.QuietHoursExcludeWeekends,
                DeduplicationMinutes = x.DeduplicationMinutes,
                CooldownMinutes = x.CooldownMinutes,
                GroupSimilarIncidents = x.GroupSimilarIncidents,
                ProviderIds = x.Providers.Select(p => p.CloudProviderId).ToList(),
                Services = x.Services.Select(s => s.ServiceName).ToList(),
                Regions = x.Regions.Select(r => r.RegionName).ToList(),
            }).ToList();
            return Ok(dtos);
        }

        [HttpPost("subscriptions")]
        public async Task<IActionResult> CreateSubscription(
            [FromBody] CloudAlertSubscriptionCreateDto dto,
            CancellationToken cancellationToken)
        {
            var entity = new MonitoringPlatform.Domain.Entities.CloudAlertSubscription
            {
                Id = Guid.NewGuid(),
                TenantId = _currentUser.TenantId,
                UserId = _currentUser.UserId,
                Name = dto.Name,
                MinSeverity = dto.MinSeverity,
                Providers = dto.ProviderIds.Select(pid => new MonitoringPlatform.Domain.Entities.CloudAlertSubscriptionProvider
                {
                    Id = Guid.NewGuid(),
                    CloudProviderId = pid,
                }).ToList(),
                Services = dto.Services.Select(s => new MonitoringPlatform.Domain.Entities.CloudAlertSubscriptionService
                {
                    Id = Guid.NewGuid(),
                    ServiceName = s,
                }).ToList(),
                Regions = dto.Regions.Select(r => new MonitoringPlatform.Domain.Entities.CloudAlertSubscriptionRegion
                {
                    Id = Guid.NewGuid(),
                    RegionName = r,
                }).ToList(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };

            await _alertSubscriptionRepo.AddAsync(entity, cancellationToken);
            return CreatedAtAction(nameof(GetSubscriptions), new { id = entity.Id }, entity.Id);
        }

        [HttpDelete("subscriptions/{id:guid}")]
        public async Task<IActionResult> DeleteSubscription(Guid id, CancellationToken cancellationToken)
        {
            await _alertSubscriptionRepo.SoftDeleteAsync(id, cancellationToken);
            return NoContent();
        }

        // ─── SLA ──────────────────────────────────────────────────────────

        [HttpGet("sla-definitions")]
        public async Task<IActionResult> GetSlaDefinitions(CancellationToken cancellationToken)
        {
            var items = await _slaDefinitionRepo.GetByTenantAsync(_currentUser.TenantId, cancellationToken);
            var dtos = items.Select(x => new SlaDefinitionDto
            {
                Id = x.Id,
                Name = x.Name,
                CloudProviderId = x.CloudProviderId,
                TargetUptimePercent = x.TargetUptimePercent,
                MeasurementWindowDays = x.MeasurementWindowDays,
            }).ToList();
            return Ok(dtos);
        }

        [HttpGet("sla-reports")]
        public async Task<IActionResult> GetSlaReports(CancellationToken cancellationToken)
        {
            var items = await _slaReportRepo.GetByTenantAsync(_currentUser.TenantId, cancellationToken);
            var dtos = items.Select(x => new SlaReportDto
            {
                Id = x.Id,
                PeriodStart = x.PeriodStart,
                PeriodEnd = x.PeriodEnd,
                ActualUptimePercent = x.ActualUptimePercent,
                DowntimeMinutes = x.DowntimeMinutes,
                BreachCount = x.BreachCount,
            }).ToList();
            return Ok(dtos);
        }

        [HttpPost("sla-definitions")]
        public async Task<IActionResult> CreateSlaDefinition([FromBody] CreateSlaDefinitionDto dto, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(new { message = "El nombre es obligatorio." });
            if (dto.TargetUptimePercent <= 0 || dto.TargetUptimePercent > 100)
                return BadRequest(new { message = "El uptime objetivo debe estar entre 0 y 100." });
            if (dto.MeasurementWindowDays <= 0)
                return BadRequest(new { message = "La ventana de medición debe ser mayor a 0." });

            var definition = new SlaDefinition
            {
                Id = Guid.NewGuid(),
                TenantId = _currentUser.TenantId,
                Name = dto.Name.Trim(),
                CloudProviderId = dto.CloudProviderId,
                TargetUptimePercent = dto.TargetUptimePercent,
                MeasurementWindowDays = dto.MeasurementWindowDays,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            await _slaDefinitionRepo.AddAsync(definition, cancellationToken);
            return Ok(new SlaDefinitionDto
            {
                Id = definition.Id,
                Name = definition.Name,
                CloudProviderId = definition.CloudProviderId,
                TargetUptimePercent = definition.TargetUptimePercent,
                MeasurementWindowDays = definition.MeasurementWindowDays,
            });
        }

        [HttpPut("sla-definitions/{id:guid}")]
        public async Task<IActionResult> UpdateSlaDefinition(Guid id, [FromBody] UpdateSlaDefinitionDto dto, CancellationToken cancellationToken)
        {
            var definition = await _slaDefinitionRepo.GetByIdAsync(id, cancellationToken);
            if (definition is null || definition.TenantId != _currentUser.TenantId)
                return NotFound();

            if (string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(new { message = "El nombre es obligatorio." });
            if (dto.TargetUptimePercent <= 0 || dto.TargetUptimePercent > 100)
                return BadRequest(new { message = "El uptime objetivo debe estar entre 0 y 100." });
            if (dto.MeasurementWindowDays <= 0)
                return BadRequest(new { message = "La ventana de medición debe ser mayor a 0." });

            definition.Name = dto.Name.Trim();
            definition.CloudProviderId = dto.CloudProviderId;
            definition.TargetUptimePercent = dto.TargetUptimePercent;
            definition.MeasurementWindowDays = dto.MeasurementWindowDays;
            definition.UpdatedAt = DateTime.UtcNow;
            await _slaDefinitionRepo.UpdateAsync(definition, cancellationToken);
            return Ok(new SlaDefinitionDto
            {
                Id = definition.Id,
                Name = definition.Name,
                CloudProviderId = definition.CloudProviderId,
                TargetUptimePercent = definition.TargetUptimePercent,
                MeasurementWindowDays = definition.MeasurementWindowDays,
            });
        }

        [HttpDelete("sla-definitions/{id:guid}")]
        public async Task<IActionResult> DeleteSlaDefinition(Guid id, CancellationToken cancellationToken)
        {
            var definition = await _slaDefinitionRepo.GetByIdAsync(id, cancellationToken);
            if (definition is null || definition.TenantId != _currentUser.TenantId)
                return NotFound();

            await _slaDefinitionRepo.SoftDeleteAsync(id, cancellationToken);
            return Ok(new { message = "Definición eliminada." });
        }

        [HttpPost("sla-definitions/{id:guid}/generate-report")]
        public async Task<IActionResult> GenerateSlaReport(Guid id, CancellationToken cancellationToken)
        {
            var definition = await _slaDefinitionRepo.GetByIdAsync(id, cancellationToken);
            if (definition is null || definition.TenantId != _currentUser.TenantId)
                return NotFound();

            var periodEnd = DateTime.UtcNow;
            var periodStart = periodEnd.AddDays(-definition.MeasurementWindowDays);

            // Calculate uptime from cloud incidents in the window
            var query = _dbContext.CloudIncidents
                .AsNoTracking()
                .Where(i => i.OccurredAt >= periodStart && i.OccurredAt <= periodEnd && !i.IsActive);

            if (definition.CloudProviderId.HasValue)
                query = query.Where(i => i.CloudProviderId == definition.CloudProviderId.Value);

            var incidents = await query.ToListAsync(cancellationToken);

            // Simple calculation: assume total possible minutes in window
            var totalMinutes = (decimal)(periodEnd - periodStart).TotalMinutes;
            var downtimeMinutes = incidents.Count * 30m; // rough estimate: 30 min per resolved incident
            var actualUptime = totalMinutes > 0
                ? ((totalMinutes - downtimeMinutes) / totalMinutes) * 100m
                : 100m;

            var breachCount = actualUptime < definition.TargetUptimePercent ? 1 : 0;

            var report = new SlaReport
            {
                Id = Guid.NewGuid(),
                SlaDefinitionId = definition.Id,
                TenantId = _currentUser.TenantId,
                PeriodStart = periodStart,
                PeriodEnd = periodEnd,
                ActualUptimePercent = actualUptime,
                DowntimeMinutes = (int)downtimeMinutes,
                BreachCount = breachCount,
                CreatedAt = DateTime.UtcNow,
            };
            await _slaReportRepo.AddAsync(report, cancellationToken);

            return Ok(new SlaReportDto
            {
                Id = report.Id,
                PeriodStart = report.PeriodStart,
                PeriodEnd = report.PeriodEnd,
                ActualUptimePercent = report.ActualUptimePercent,
                DowntimeMinutes = report.DowntimeMinutes,
                BreachCount = report.BreachCount,
            });
        }

        [HttpGet("providers/{slug}/health")]
        public async Task<IActionResult> GetProviderHealth(string slug, CancellationToken cancellationToken)
        {
            var detail = await _providerDetailService.GetProviderDetailAsync(_currentUser.TenantId, slug, cancellationToken);
            if (detail is null)
            {
                return NotFound();
            }

            if (string.IsNullOrWhiteSpace(detail.Provider.StatusPageUrl))
            {
                return Ok(new { status = "unknown", reason = "No status page URL configured", checkedAt = DateTime.UtcNow });
            }

            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(10);
            try
            {
                var response = await client.SendAsync(new HttpRequestMessage(HttpMethod.Head, detail.Provider.StatusPageUrl), cancellationToken);
                return Ok(new
                {
                    status = response.IsSuccessStatusCode ? "healthy" : "unhealthy",
                    statusCode = (int)response.StatusCode,
                    checkedAt = DateTime.UtcNow,
                });
            }
            catch (Exception ex)
            {
                return Ok(new { status = "unhealthy", reason = ex.Message, checkedAt = DateTime.UtcNow });
            }
        }

        [HttpPost("webhooks/test")]
        public async Task<IActionResult> TestWebhook([FromBody] TestWebhookDto dto, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(dto.Url))
            {
                return BadRequest("URL requerida.");
            }

            var dispatcher = HttpContext.RequestServices.GetRequiredService<INotificationDispatcher>();
            var success = await dispatcher.DispatchWebhookAsync(
                dto.Url,
                new { message = "Test webhook from CloudAlertHub", timestamp = DateTime.UtcNow },
                _currentUser.TenantId,
                AlertType.Test,
                cancellationToken);

            return Ok(new { success });
        }
    }
}
