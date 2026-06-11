using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Services;

namespace MonitoringPlatform.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class NetworkInfoController : ControllerBase
    {
        private readonly NetworkInfoService _service;

        public NetworkInfoController(NetworkInfoService service)
        {
            _service = service;
        }

        [HttpGet("lookup")]
        public async Task<IActionResult> Lookup([FromQuery] string url)
        {
            if (string.IsNullOrWhiteSpace(url))
                return BadRequest(new { message = "El parámetro 'url' es requerido." });

            var result = await _service.GetInfoAsync(url);
            return Ok(result);
        }
    }
}
