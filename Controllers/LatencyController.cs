using System.Threading;
using System.Threading.Tasks;
using CloudAlertApp.Models;
using CloudAlertApp.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace CloudAlertApp.Controllers
{
    [ApiController]
    [Route("api/latency")]
    public class LatencyController : ControllerBase
    {
        private readonly ILatencyProbeService _latencyProbeService;
        private readonly ILogger<LatencyController> _logger;

        public LatencyController(ILatencyProbeService latencyProbeService, ILogger<LatencyController> logger)
        {
            _latencyProbeService = latencyProbeService;
            _logger = logger;
        }

        [HttpPost("measure")]
        public async Task<IActionResult> MeasureLatency([FromBody] LatencyProbeRequest request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.EndpointUrl))
            {
                return BadRequest(new { error = "EndpointUrl es obligatorio." });
            }

            // Si no se proporciona ServiceName, usar el host o la URL como identificador
            if (string.IsNullOrWhiteSpace(request.ServiceName))
            {
                try
                {
                    if (Uri.TryCreate(request.EndpointUrl, UriKind.Absolute, out var u) && !string.IsNullOrWhiteSpace(u.Host))
                    {
                        request.ServiceName = u.Host;
                    }
                    else
                    {
                        request.ServiceName = request.EndpointUrl;
                    }
                }
                catch
                {
                    request.ServiceName = request.EndpointUrl;
                }
            }

            try
            {
                var result = await _latencyProbeService.ProbeAsync(request, cancellationToken);
                return Ok(result);
            }
            catch (System.Exception exception)
            {
                _logger.LogError(exception, "Error al medir latencia para {EndpointUrl}", request.EndpointUrl);
                return StatusCode(500, new { error = "No se pudo completar la medición de latencia." });
            }
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetHistory([FromQuery] string serviceName, [FromQuery] int limit = 20, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(serviceName))
            {
                return BadRequest(new { error = "serviceName es obligatorio." });
            }

            var history = await _latencyProbeService.GetHistoryAsync(serviceName, limit, cancellationToken);
            return Ok(history);
        }
    }
}
