using Microsoft.AspNetCore.Mvc;
using CloudAlertApp.Data;
using CloudAlertApp.Models;
using Microsoft.EntityFrameworkCore;
using PdfSharp.Drawing;
using PdfSharp.Pdf;

namespace CloudAlertApp.Controllers
{
    public class IncidentesPageController : Controller
    {
        private readonly AppDbContext _context;

        public IncidentesPageController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("incidencias")]
        public async Task<IActionResult> Index(string? buscar, string? estado, string? severidad)
        {
            // Filtrar incidentes de la última semana
            var fechaHace7Dias = DateTime.UtcNow.AddDays(-7);
            var query = _context.Incidentes.Include(i => i.Proveedor).Where(i => i.Fecha >= fechaHace7Dias).AsQueryable();

            if (!string.IsNullOrEmpty(buscar))
            {
                query = query.Where(i => i.Titulo.Contains(buscar) || i.Descripcion.Contains(buscar) || i.Codigo.Contains(buscar));
            }

            if (!string.IsNullOrEmpty(estado) && estado != "Todos")
            {
                if (Enum.TryParse<EstadoIncidente>(estado, out var estadoParsed))
                {
                    query = query.Where(i => i.Estado == estadoParsed);
                }
            }

            if (!string.IsNullOrEmpty(severidad) && severidad != "Todas")
            {
                if (Enum.TryParse<Severidad>(severidad, out var severidadParsed))
                {
                    query = query.Where(i => i.Severidad == severidadParsed);
                }
            }

            var incidentes = await query.OrderByDescending(i => i.Fecha).Take(15).ToListAsync();

            // Pasar estadísticas al ViewBag (solo incidentes de la última semana)
            ViewBag.Abiertos = incidentes.Count(i => i.Estado == EstadoIncidente.Abierto);
            ViewBag.EnProgreso = incidentes.Count(i => i.Estado == EstadoIncidente.EnProgreso);
            ViewBag.Resueltos = incidentes.Count(i => i.Estado == EstadoIncidente.Resuelto);
            ViewBag.Total = incidentes.Count();

            return View("~/Views/Incidentes/Index.cshtml", incidentes);
        }

        [HttpGet("incidencias/exportar/{id}")]
        public async Task<IActionResult> ExportarPdf(int id)
        {
            var incidente = await _context.Incidentes.Include(i => i.Proveedor).FirstOrDefaultAsync(i => i.Id == id);
            
            if (incidente == null)
            {
                return NotFound();
            }

            using (var memoryStream = new MemoryStream())
            {
                using (var pdfDoc = new PdfDocument())
                {
                    var page = pdfDoc.AddPage();
                    var gfx = XGraphics.FromPdfPage(page);
                    var fontNormal = new XFont("Arial", 11);
                    var fontTitle = new XFont("Arial", 16);
                    var fontSection = new XFont("Arial", 13);

                    double yPosition = 40;
                    const double lineHeight = 20;

                    // Título
                    gfx.DrawString($"Reporte de Incidente: {incidente.Codigo}", fontTitle, XBrushes.Black, new XRect(40, yPosition, 500, lineHeight), XStringFormats.TopLeft);
                    yPosition += lineHeight + 20;

                    gfx.DrawString("INFORMACIÓN GENERAL", fontSection, XBrushes.Black, new XRect(40, yPosition, 500, lineHeight), XStringFormats.TopLeft);
                    yPosition += lineHeight;

                    gfx.DrawString($"Código: {incidente.Codigo}", fontNormal, XBrushes.Black, new XRect(40, yPosition, 500, lineHeight), XStringFormats.TopLeft);
                    yPosition += lineHeight;

                    gfx.DrawString($"Título: {incidente.Titulo}", fontNormal, XBrushes.Black, new XRect(40, yPosition, 500, lineHeight), XStringFormats.TopLeft);
                    yPosition += lineHeight;

                    gfx.DrawString($"Descripción: {incidente.Descripcion}", fontNormal, XBrushes.Black, new XRect(40, yPosition, 500, lineHeight), XStringFormats.TopLeft);
                    yPosition += lineHeight;

                    gfx.DrawString($"Fecha: {incidente.Fecha:yyyy-MM-dd HH:mm:ss}", fontNormal, XBrushes.Black, new XRect(40, yPosition, 500, lineHeight), XStringFormats.TopLeft);
                    yPosition += lineHeight + 20;

                    gfx.DrawString("DETALLES", fontSection, XBrushes.Black, new XRect(40, yPosition, 500, lineHeight), XStringFormats.TopLeft);
                    yPosition += lineHeight;

                    gfx.DrawString($"Servicio: {incidente.Servicio}", fontNormal, XBrushes.Black, new XRect(40, yPosition, 500, lineHeight), XStringFormats.TopLeft);
                    yPosition += lineHeight;

                    gfx.DrawString($"Severidad: {incidente.Severidad}", fontNormal, XBrushes.Black, new XRect(40, yPosition, 500, lineHeight), XStringFormats.TopLeft);
                    yPosition += lineHeight;

                    gfx.DrawString($"Estado: {incidente.Estado}", fontNormal, XBrushes.Black, new XRect(40, yPosition, 500, lineHeight), XStringFormats.TopLeft);
                    yPosition += lineHeight;

                    gfx.DrawString($"Proveedor Asignado: {(incidente.Proveedor?.Nombre ?? "Sin asignar")}", fontNormal, XBrushes.Black, new XRect(40, yPosition, 500, lineHeight), XStringFormats.TopLeft);
                    gfx.Dispose();
                    pdfDoc.Save(memoryStream, false);
                }
                memoryStream.Position = 0;
                var pdf = memoryStream.ToArray();
                return File(pdf, "application/pdf", $"Incidente_{incidente.Codigo}.pdf");
            }
        }

        [HttpGet("incidencias/exportar-todos")]
        public async Task<IActionResult> ExportarTodos()
        {
            // Filtrar incidentes de la última semana
            var fechaHace7Dias = DateTime.UtcNow.AddDays(-7);
            var incidentes = await _context.Incidentes
                .Include(i => i.Proveedor)
                .Where(i => i.Fecha >= fechaHace7Dias)
                .OrderByDescending(i => i.Fecha)
                .Take(15)
                .ToListAsync();

            using (var memoryStream = new MemoryStream())
            {
                using (var pdfDoc = new PdfDocument())
                {
                    var page = pdfDoc.AddPage();
                    var gfx = XGraphics.FromPdfPage(page);
                    var fontNormal = new XFont("Arial", 11);
                    var fontTitle = new XFont("Arial", 16);
                    var fontSection = new XFont("Arial", 13);

                    double yPosition = 40;
                    const double lineHeight = 20;

                    // Título
                    gfx.DrawString("Reporte de Incidentes", fontTitle, XBrushes.Black, new XRect(40, yPosition, 500, lineHeight), XStringFormats.TopLeft);
                    yPosition += lineHeight + 10;

                    gfx.DrawString($"Generado: {DateTime.Now:yyyy-MM-dd HH:mm:ss}", fontNormal, XBrushes.Black, new XRect(40, yPosition, 500, lineHeight), XStringFormats.TopLeft);
                    yPosition += lineHeight;

                    gfx.DrawString($"Total de incidentes: {incidentes.Count}", fontNormal, XBrushes.Black, new XRect(40, yPosition, 500, lineHeight), XStringFormats.TopLeft);
                    yPosition += lineHeight + 10;

                    // Listar todos los incidentes
                    foreach (var incidente in incidentes)
                    {
                        if (yPosition > 750)
                        {
                            gfx.Dispose();
                            page = pdfDoc.AddPage();
                            gfx = XGraphics.FromPdfPage(page);
                            yPosition = 40;
                        }

                        gfx.DrawString($"{incidente.Codigo} - {incidente.Titulo}", fontSection, XBrushes.Black, new XRect(40, yPosition, 500, lineHeight), XStringFormats.TopLeft);
                        yPosition += lineHeight;

                        gfx.DrawString($"Estado: {incidente.Estado}", fontNormal, XBrushes.Black, new XRect(40, yPosition, 500, lineHeight), XStringFormats.TopLeft);
                        yPosition += lineHeight;

                        gfx.DrawString($"Severidad: {incidente.Severidad}", fontNormal, XBrushes.Black, new XRect(40, yPosition, 500, lineHeight), XStringFormats.TopLeft);
                        yPosition += lineHeight;

                        gfx.DrawString($"Servicio: {incidente.Servicio}", fontNormal, XBrushes.Black, new XRect(40, yPosition, 500, lineHeight), XStringFormats.TopLeft);
                        yPosition += lineHeight;

                        gfx.DrawString($"Descripción: {incidente.Descripcion}", fontNormal, XBrushes.Black, new XRect(40, yPosition, 500, lineHeight), XStringFormats.TopLeft);
                        yPosition += lineHeight;

                        gfx.DrawString($"Proveedor: {(incidente.Proveedor?.Nombre ?? "Sin asignar")}", fontNormal, XBrushes.Black, new XRect(40, yPosition, 500, lineHeight), XStringFormats.TopLeft);
                        yPosition += lineHeight;

                        gfx.DrawString($"Fecha: {incidente.Fecha:yyyy-MM-dd HH:mm:ss}", fontNormal, XBrushes.Black, new XRect(40, yPosition, 500, lineHeight), XStringFormats.TopLeft);
                        yPosition += lineHeight + 10;
                    }
                    gfx.Dispose();
                    pdfDoc.Save(memoryStream, false);
                }
                memoryStream.Position = 0;
                var pdf = memoryStream.ToArray();
                return File(pdf, "application/pdf", $"Reporte_Incidentes_{DateTime.Now:yyyy-MM-dd}.pdf");
            }
        }
    }
}
