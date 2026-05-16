using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using CloudAlertApp.Data;
using CloudAlertApp.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CloudAlertApp.Controllers
{
    [ApiController]
    [Route("api/incidentes")]
    public class IncidentesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ITranslationService _translationService;

        public IncidentesController(AppDbContext context, ITranslationService translationService)
        {
            _context = context;
            _translationService = translationService;
        }

        [HttpGet("activos")]
        public async Task<IActionResult> GetActivos()
        {
            var data = await _context.Incidentes
                .Where(i => i.Activo)
                .Include(i => i.Proveedor)
                .ToListAsync();

            var result = data
                .GroupBy(i => i.Proveedor.Nombre)
                .Select(g => new
                {
                    proveedor = g.Key,
                    total = g.Count(),
                    criticos = g.Count(x => x.Severidad == Models.Severidad.Critica),
                    altos = g.Count(x => x.Severidad == Models.Severidad.Alta),
                    incidentes = g.Select(i => new
                    {
                        i.Codigo,
                        i.Titulo,
                        i.Descripcion,
                        i.Severidad,
                        i.UrlDetalle,
                        i.Fecha
                    })
                });

            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetDetalle(int id)
        {
            var incidente = await _context.Incidentes
                .Include(i => i.Proveedor)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (incidente == null)
            {
                return NotFound();
            }

            return Ok(new
            {
                incidente.Id,
                incidente.Codigo,
                incidente.Titulo,
                incidente.Descripcion,
                severidad = incidente.Severidad.ToString(),
                incidente.Servicio,
                proveedor = incidente.Proveedor?.Nombre,
                fecha = incidente.Fecha.ToString("yyyy-MM-dd HH:mm"),
                incidente.UrlDetalle,
                estado = "Abierto"
            });
        }

        [HttpPost("translate")]
        public async Task<IActionResult> Translate([FromBody] TranslateRequest request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request?.Text))
            {
                return BadRequest("El texto a traducir no puede estar vacío");
            }

            try
            {
                var translatedText = await _translationService.TranslateAsync(
                    request.Text,
                    request.SourceLanguage ?? "en",
                    request.TargetLanguage ?? "es",
                    cancellationToken);

                return Ok(new { translatedText });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Error al traducir el texto", details = ex.Message });
            }
        }

    }

    public class TranslateRequest
    {
        public string? Text { get; set; }
        public string? SourceLanguage { get; set; }
        public string? TargetLanguage { get; set; }
    }
}