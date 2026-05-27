using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;
using MonitoringPlatform.API.Configurations;
using MonitoringPlatform.API.Hubs;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Application.Services;
using MonitoringPlatform.API.Services;

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
            ISlaReportRepository slaReportRepo)
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
        }

        [HttpGet("overview")]
        public async Task<IActionResult> GetOverview(
            [FromQuery] string? provider,
            [FromQuery] int? severity,
            [FromQuery] bool activeOnly = false,
            [FromQuery] int take = 100)
        {
            var result = await _service.GetOverviewAsync(new CloudStatusQueryDto
            {
                Provider = provider,
                Severity = severity,
                ActiveOnly = activeOnly,
                Take = take,
            });

            return Ok(result);
        }

        [EnableRateLimiting("general")]
        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh(CancellationToken cancellationToken)
        {
            var result = await _coordinator.IngestAsync(_options.ToSeedDtos(), cancellationToken);

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
    }
}
