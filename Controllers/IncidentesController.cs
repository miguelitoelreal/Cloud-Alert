using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using CloudAlertApp.Data;
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

        public IncidentesController(AppDbContext context)
        {
            _context = context;
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

    }
}