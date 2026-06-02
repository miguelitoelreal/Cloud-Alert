using System;
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
    public class MonitorsController : ControllerBase
    {
        private readonly MonitorService _service;
        private readonly MonitorLogService _logService;

        public MonitorsController(MonitorService service, MonitorLogService logService)
        {
            _service = service;
            _logService = logService;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateMonitorDto dto)
        {
            var result = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpGet("{id}/logs")]
        public async Task<IActionResult> GetLogs(Guid id, [FromQuery] int take = 100)
        {
            var monitor = await _service.GetByIdAsync(id);
            if (monitor == null) return NotFound();

            var logs = await _logService.GetByMonitorIdAsync(id, take);
            return Ok(logs);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateMonitorDto dto)
        {
            var result = await _service.UpdateAsync(id, dto);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var deleted = await _service.DeleteAsync(id);
            if (!deleted) return NotFound();
            return NoContent();
        }
    }
}
